#!/usr/bin/env node
/**
 * generate-social-queue.mjs
 *
 * Builds the date-scheduled social broadcast queue from published content.
 * The post's `date` is the TRIGGER (when it broadcasts); `autopublish: true`
 * is the opt-in (whether it broadcasts at all). This replaces the old
 * fire-on-commit path — merging content no longer posts to social; the
 * worker's hourly cron drips each entry when its scheduled time arrives.
 *
 * A post is queued iff ALL of:
 *   - draft: false            (it's live on the site)
 *   - autopublish: true       (deliberate opt-in to social broadcast)
 *   - date >= today (AEST)    (re-broadcast guard: past posts are assumed
 *                              already sent; their id won't re-fire anyway,
 *                              but we never even queue them)
 *
 * The scheduled time is the post's `date` instant when it carries an explicit
 * time-of-day (e.g. `2026-06-25T12:05:00Z`), so same-day posts stagger in
 * order instead of collapsing to one slot. Date-only dates fall back to 09:00
 * AEST.
 *
 * Idempotency: each entry's id is stable (`drip-<platform>-<slug>`), so
 * re-running + re-syncing never creates duplicates, and the worker's
 * `idempotent:<id>` record stops any entry firing twice.
 *
 * Usage:
 *   node scripts/generate-social-queue.mjs            # write social/facebook-posts.json
 *   node scripts/generate-social-queue.mjs --dry-run  # print to stdout, write nothing
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://adrianwedd.com';
const PLATFORMS = ['facebook', 'bluesky', 'twitter'];
// Broadcast timezone (Tasmania). DST-aware via Intl: +10:00 (AEST) in winter,
// +11:00 (AEDT) roughly Oct–Apr. Posts with an explicit time in their `date`
// fire at that UTC instant instead, so staggered timestamps drip in order.
const BROADCAST_TZ = 'Australia/Hobart';
const BROADCAST_HOUR = 'T09:00:00';
const QUEUE_FILE = join(ROOT, 'social/facebook-posts.json');

const dryRun = process.argv.includes('--dry-run');

/** UTC-offset suffix (e.g. '+10:00' or '+11:00') for a YYYY-MM-DD date in the broadcast timezone. */
function broadcastOffset(datePart) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: BROADCAST_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(`${datePart}T00:00:00Z`));
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+10:00';
  return name === 'GMT' ? '+00:00' : name.replace('GMT', '');
}

// Past-date guard boundary: "today" in the broadcast timezone (DST-aware).
// Compare date-parts, not epochs — the 09:00 local slot is 22:00Z/23:00Z the
// previous day, so an epoch-vs-UTC-midnight comparison silently drops same-day
// posts (this stranded Eight Minutes Part 1 on 2026-06-11).
const todayLocal = new Intl.DateTimeFormat('en-CA', {
  timeZone: BROADCAST_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

/** Collect candidate posts from a content collection. */
function collect(dir, kind) {
  const abs = join(ROOT, 'src/content', dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map((f) => {
      const { data } = matter(readFileSync(join(abs, f), 'utf8'));
      return { file: f, kind, fm: data };
    });
}

function resolveImage(hero) {
  if (!hero) return undefined;
  if (hero.startsWith('https://')) return hero;
  if (hero.startsWith('/')) return `${SITE}${hero}`;
  return undefined;
}

const posts = [];
const skipped = [];

for (const { file, kind, fm } of [...collect('blog', 'blog'), ...collect('projects', 'projects')]) {
  // Same extension handling as slug() in src/lib/utils.ts — strip .md OR .mdx.
  const slug = kind === 'blog'
    ? basename(file).replace(/-post(\.mdx?)?$/, '').replace(/\.mdx?$/, '')
    : basename(file).replace(/\.mdx?$/, '');

  if (fm.draft === true) { skipped.push([slug, 'draft']); continue; }
  if (fm.autopublish !== true) { skipped.push([slug, 'no autopublish opt-in']); continue; }
  if (!fm.title) { skipped.push([slug, 'no title']); continue; }
  if (!fm.date) { skipped.push([slug, 'no date']); continue; }

  // gray-matter parses `date: 2026-06-07` into a Date object — normalise either form to YYYY-MM-DD.
  const dateIsObj = fm.date instanceof Date;
  const datePart = (dateIsObj ? fm.date.toISOString() : String(fm.date)).slice(0, 10);

  // Honour an explicit time-of-day in the frontmatter `date` so same-day posts
  // don't all collapse to one slot — they drip at their stamped times, in
  // order. Date-only posts (no T..:.. in the value, or midnight UTC) fall back
  // to the 09:00 local (Hobart) broadcast slot. The UTC instant is used as-is; a post
  // stamped 12:00Z fires at 12:00Z (22:00 AEST), not reinterpreted as AEST.
  const hasExplicitTime = dateIsObj
    ? Boolean(fm.date.getUTCHours() || fm.date.getUTCMinutes() || fm.date.getUTCSeconds())
    : /T\d{2}:\d{2}/.test(String(fm.date));
  const scheduledAt = hasExplicitTime
    ? (dateIsObj ? fm.date.toISOString() : String(fm.date))
    : `${datePart}${BROADCAST_HOUR}${broadcastOffset(datePart)}`;
  const epoch = new Date(scheduledAt).getTime();
  if (!Number.isFinite(epoch)) { skipped.push([slug, 'bad date']); continue; }
  if (datePart < todayLocal) { skipped.push([slug, 'past date (assumed already broadcast)']); continue; }

  const url = `${SITE}/${kind}/${slug}/`;
  const message = kind === 'projects'
    ? `New project: ${fm.title}\n\n${fm.description ?? ''}\n\n${url}`
    : `${fm.title}\n\n${fm.description ?? ''}\n\n${url}`;
  const imageUrl = resolveImage(fm.heroImage);
  // Prefer the .jpg twin as the social card — FB Graph /photos and Twitter
  // v1.1 media/upload are unreliable with .webp; the CI gate guarantees a .jpg
  // twin for every .webp heroImage.
  let socialImageUrl = imageUrl;
  if (imageUrl && imageUrl.endsWith('.webp')) {
    const twin = fm.heroImage.replace(/\.webp$/, '.jpg');
    if (existsSync(join(ROOT, 'public', twin))) socialImageUrl = `${SITE}${twin}`;
  }
  const videoUrl = fm.videoUrl ?? fm.notebookAssets?.videoUrl;

  for (const platform of PLATFORMS) {
    posts.push({
      id: `drip-${platform}-${slug}`,
      platform,
      type: 'text',
      message,
      // Worker can't deliver NLM-sized videos (FB no video path; Twitter image-only
      // ≤5MB; Bluesky ≤20MB; NLM videos are 30-100MB) — attach the infographic as
      // the card and drop the undeliverable videoUrl. FB renders the link card via
      // og:image on type:'text' (ignores imageUrl).
      ...(socialImageUrl ? { imageUrl: socialImageUrl } : videoUrl ? { videoUrl } : {}),
      scheduledAt,
      scheduledAtEpoch: epoch,
    });
  }
}

posts.sort((a, b) => a.scheduledAtEpoch - b.scheduledAtEpoch);

// Preserve version/pageId from the existing seed file.
const existing = existsSync(QUEUE_FILE) ? JSON.parse(readFileSync(QUEUE_FILE, 'utf8')) : {};
const out = {
  version: existing.version ?? 1,
  description: 'Date-scheduled social queue — generated from content by scripts/generate-social-queue.mjs (KV authoritative for state)',
  pageId: existing.pageId,
  posts,
};

const json = JSON.stringify(out, null, 2) + '\n';

if (dryRun) {
  process.stdout.write(json);
  console.error(`\n[dry-run] ${posts.length} queue entr${posts.length === 1 ? 'y' : 'ies'} from ${posts.length / PLATFORMS.length} post(s) across ${PLATFORMS.length} platforms.`);
  console.error(`[dry-run] skipped ${skipped.length}: ${skipped.map(([s, r]) => `${s} (${r})`).join(', ') || 'none'}`);
} else {
  writeFileSync(QUEUE_FILE, json);
  console.log(`Wrote ${posts.length} queue entries to ${QUEUE_FILE} (${posts.length / PLATFORMS.length} posts × ${PLATFORMS.length} platforms).`);
}
