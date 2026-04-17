// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';
import fs from 'node:fs';
import path from 'node:path';

// Build URL→lastmod map from content frontmatter
function buildContentDateMap() {
  const map = new Map();
  const dirs = ['blog', 'projects', 'gallery', 'audio'];
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), 'src/content', dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];
      const updated = fm.match(/^updatedDate:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
      const date = fm.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
      const dateStr = updated ?? date;
      if (!dateStr) continue;
      const slug = file.replace(/\.mdx?$/, '');
      map.set(`/${dir}/${slug}/`, dateStr);
    }
  }
  return map;
}

const contentDates = buildContentDateMap();

/**
 * @param {string} pathname
 */
function getSitemapMeta(pathname) {
  if (pathname === '/') return { priority: 1.0, changefreq: 'daily' };
  if (['/blog/', '/projects/'].includes(pathname)) return { priority: 0.8, changefreq: 'weekly' };
  if (/^\/blog\/(?!tag\/)[^/]+\/$/.test(pathname)) return { priority: 0.8, changefreq: 'weekly' };
  if (/^\/projects\/[^/]+\/$/.test(pathname)) return { priority: 0.8, changefreq: 'monthly' };
  if (/^\/audio\/[^/]+\/$/.test(pathname)) return { priority: 0.7, changefreq: 'weekly' };
  if (/^\/gallery\//.test(pathname)) return { priority: 0.6, changefreq: 'monthly' };
  if (['/services/', '/about/', '/contact/', '/new/', '/now/'].includes(pathname)) return { priority: 0.7, changefreq: 'monthly' };
  if (pathname === '/activity/') return { priority: 0.7, changefreq: 'weekly' };
  return { priority: 0.5, changefreq: 'monthly' };
}

export default defineConfig({
  site: 'https://adrianwedd.com',
  trailingSlash: 'always',
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const date = contentDates.get(pathname);
        if (date) item.lastmod = date;
        const meta = getSitemapMeta(pathname);
        item.priority = meta.priority;
        // @ts-ignore - Astro's EnumChangefreq is a bit strict
        item.changefreq = meta.changefreq;
        return item;
      },
    }),
    preact(),
    tailwind(),
  ],
  redirects: {
    '/projects/ticketsmith/': '/projects/',
    // Legacy WordPress URLs still indexed by Google
    '/2023/03/paperclip-maximizer/': '/',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  experimental: {
    csp: {
      algorithm: 'SHA-256',
      scriptDirective: {
        strictDynamic: true,
        resources: [
          "'self'",
          "'wasm-unsafe-eval'",
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://snap.licdn.com',
          'https://px.ads.linkedin.com',
          'https://pagead2.googlesyndication.com',
          'https://tpc.googlesyndication.com',
          'https://googleads.g.doubleclick.net',
          'https://adservice.google.com',
          'https://challenges.cloudflare.com',
        ],
      },
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'"],
      },
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://www.google-analytics.com https://px.ads.linkedin.com https://www.googletagmanager.com https://*.tile.openstreetmap.org https://tpc.googlesyndication.com https://googleads.g.doubleclick.net https://www.linkedin.com",
        "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://ep1.adtrafficquality.google https://snap.licdn.com https://px.ads.linkedin.com https://pagead2.googlesyndication.com https://api.book.adrianwedd.com https://api.github.com https://cdn.adrianwedd.com https://ops.adrianwedd.com https://challenges.cloudflare.com",
        "media-src 'self' https://cdn.adrianwedd.com",
        "frame-src https://www.openstreetmap.org https://challenges.cloudflare.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ],
    },
  },
});
