# Responsive notebook heroes

`public/notebook-assets/` is the canonical artwork: retain these permanent
URLs for notebook downloads, video posters, gallery/audio pages and JPG
social previews. No extra image binaries need to be committed.

`astro.config.mjs` automatically prepares ignored imports under
`src/assets/generated-heroes/` before every Astro build, check or dev start.
Only published blog/project Picture heroes are copied. Drafts and video-only
covers are excluded; stale generated files are removed. Copies are refreshed
when their canonical bytes change. Restart dev (or run
`node scripts/sync-hero-images.mjs`) after changing artwork or hero references.

`src/lib/hero-image.ts` resolves the permanent URLs to imported metadata.
Astro generates AVIF and WebP at 480, 768 and 1200 px, with a 1200 px fallback
and sizes matching the content column. The original 1920 px proposal exceeded
the 100 MiB asset budget; full resolution remains at the public URL.

After building, `node scripts/check-hero-images.mjs` checks every expected
hero, both formats, exact widths, actual file metadata and the asset budget.
`isPublicPath()` remains needed by `NotebookAssets.astro`; it is no longer
used by the blog/project hero templates.
