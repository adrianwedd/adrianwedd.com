# QA Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three remaining code workstreams from the approved 2026-07-19 spec: tag URL normalization with worker-level 301s, crisis-alert email via Cloudflare Email Sending, and HeroCanvas externalization. (PR #531 rebase/merge and Dependabot bumps are already done operationally.)

**Architecture:** Tag canonicalization is a shared `tagSlug()` util applied at every tag-URL generation site plus frontmatter normalization of blog tags; old mixed-case/spaced URLs get real 301s from the existing `worker-csp` edge worker (which already does www→apex). Crisis email is a `send_email` binding in `worker/` used inside the existing comment-monitor cron with a KV dedupe guard. HeroCanvas moves from `is:inline` to an Astro-processed module script (external hashed asset; the CSP worker nonces every `<script>` element, so strict-dynamic still passes).

**Tech Stack:** Astro 6, TypeScript, Cloudflare Workers (Hono, vitest-pool-workers), Cloudflare Email Sending (`cloudflare:email` EmailMessage).

## Global Constraints

- **No historic permalink may 404** — old tag URLs must 301, never die. Content detail URLs untouched.
- Descriptions ≤160 chars; prettier `format:check` and eslint gates on every PR; `npm run verify` before push.
- Blog is the only collection with non-canonical tags; projects/audio/gallery are already lowercase-hyphenated but the redirect rule covers their paths too (defence in depth).
- Worker deploys now go via `.github/workflows/worker-deploy.yml` (PR #531), not manual wrangler.

---

### Task 1: `tagSlug()` util + unit tests

**Files:**
- Modify: `src/lib/utils.ts`
- Test: `test/unit/utils.spec.ts`

**Interfaces:**
- Produces: `export function tagSlug(tag: string): string` — lowercase, whitespace runs → single hyphen, trims stray hyphens. `tagSlug('AI safety') === 'ai-safety'`, idempotent on already-canonical tags.

- [ ] Add failing tests to `test/unit/utils.spec.ts`:

```ts
import { tagSlug } from '../../src/lib/utils';

describe('tagSlug', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(tagSlug('AI safety')).toBe('ai-safety');
    expect(tagSlug('Lyria Chronicles')).toBe('lyria-chronicles');
  });
  it('is idempotent on canonical tags', () => {
    expect(tagSlug('ai-safety')).toBe('ai-safety');
    expect(tagSlug('red-teaming')).toBe('red-teaming');
  });
  it('collapses whitespace runs and trims hyphens', () => {
    expect(tagSlug('  deep   learning ')).toBe('deep-learning');
  });
});
```

- [ ] Run `npm run test:unit` — expect FAIL (tagSlug not exported)
- [ ] Implement in `src/lib/utils.ts`:

```ts
/** Canonical URL slug for a tag: lowercase, whitespace → hyphen. */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

- [ ] Run `npm run test:unit` — expect PASS; commit.

### Task 2: Normalize blog frontmatter tags + apply `tagSlug` at every tag-URL site

**Files:**
- Modify: `src/content/blog/*.md` (tags containing uppercase/spaces: `AI`, `AI safety`, `Lyria`, `Lyria Chronicles`, `AI agents`, `Claude Code`, `deep learning`, `generative audio`, `account takeover`, `incident response`, `social engineering`, `found sound`)
- Modify: `src/pages/blog/tag/[tag]/[...page].astro` (getStaticPaths: `params: { tag: tagSlug(tag) }`; group posts by slug so `AI` + `ai` merge; links use `tagSlug`)
- Modify: `src/pages/blog/[...page].astro:87`, `src/pages/blog/[...slug].astro:287`, `src/pages/blog/tags/index.astro:32` — hrefs become `/blog/tag/${tagSlug(tag)}/`
- Same treatment (href-side only) for `src/pages/projects/tag/[tag].astro`, `src/pages/audio/tag/[tag]/[...page].astro`, `src/pages/gallery/tag/[tag].astro` param generation — wrap with `tagSlug` for safety (no-op today).

**Interfaces:**
- Consumes: `tagSlug` from Task 1.
- Produces: all generated tag archive URLs are canonical; no page links a non-canonical tag URL.

- [ ] Normalize the blog frontmatter tag values to their `tagSlug` form (e.g. `AI safety` → `ai-safety`), merging duplicates within a post's array.
- [ ] Dedupe + slug in `getStaticPaths` of the blog tag archive; key pagination by slug.
- [ ] Run `npm run build && npm run check:links` — expect clean (no link to a non-canonical tag URL, no orphaned archive).
- [ ] Run `node scripts/validate-content.js` — expect clean; commit.

### Task 3: worker-csp 301 for non-canonical tag URLs

**Files:**
- Modify: `worker-csp/src/index.ts` (after the www→apex block)
- Test: `worker-csp/test/index.test.ts`

**Interfaces:**
- Produces: any request path matching `^/(blog|projects|audio|gallery)/tag/<seg>` where decoded `<seg>` ≠ its canonical form 301s to the canonical path, preserving trailing pagination path and query string.

- [ ] Add failing tests (vitest-pool-workers, `SELF.fetch`):

```ts
it('301s mixed-case tag URLs to canonical, preserving page + query', async () => {
  const res = await SELF.fetch('https://adrianwedd.com/blog/tag/AI%20safety/2/?x=1', { redirect: 'manual' });
  expect(res.status).toBe(301);
  expect(res.headers.get('location')).toBe('https://adrianwedd.com/blog/tag/ai-safety/2/?x=1');
});
it('does not redirect canonical tag URLs', async () => { /* expect 200 passthrough via mockOrigin */ });
```

- [ ] Implement in `fetch()` after www redirect:

```ts
const tagMatch = inboundUrl.pathname.match(/^\/(blog|projects|audio|gallery)\/tag\/([^/]+)(\/.*)?$/);
if (tagMatch) {
  const raw = decodeURIComponent(tagMatch[2]);
  const canonical = raw.toLowerCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (canonical !== raw) {
    const rest = tagMatch[3] ?? '/';
    return Response.redirect(
      `https://${CANONICAL_HOST}/${tagMatch[1]}/tag/${encodeURIComponent(canonical)}${rest}${inboundUrl.search}`,
      301,
    );
  }
}
```

- [ ] `cd worker-csp && npm test` — all green; commit. Deploy rides the worker-deploy workflow on merge.

### Task 4: Crisis-alert email via Cloudflare Email Sending

**Files:**
- Modify: `worker/wrangler.toml` (send_email binding + vars)
- Create: `worker/src/email.ts`
- Modify: `worker/src/cron/comments.ts` (send after crisis flag write, deduped)
- Test: `worker/test/` (extend comments cron spec)

**Interfaces:**
- Produces: `sendCrisisAlert(env, comment): Promise<void>` — builds a plain-text MIME message and calls `env.CRISIS_EMAIL.send(new EmailMessage(from, to, raw))`. Never throws (catches + console.error).
- wrangler: `[[send_email]] name = "CRISIS_EMAIL"` plus `CRISIS_ALERT_FROM = "alerts@adrianwedd.com"`, `CRISIS_ALERT_TO = "adrian@adrianwedd.com"` vars. One-time dashboard setup: verify destination address in Email Routing (documented in worker README).

- [ ] Failing test: crisis comment → exactly one `env.CRISIS_EMAIL.send` call; second run same comment → zero (dedupe via KV `crisis-emailed:${comment.id}`, 90-day TTL); `send` rejecting → cron still resolves ok.
- [ ] Implement `email.ts` (raw MIME string: From/To/Subject/Date + body with comment id, post id, message excerpt, health-endpoint pointer); guard in `comments.ts` right after the `flag-crisis:` put.
- [ ] `cd worker && npm test` — green; typecheck green; commit. Note in README the destination-verification prerequisite.

### Task 5: HeroCanvas externalization

**Files:**
- Modify: `src/components/HeroCanvas.astro` (line 1: `<script is:inline>` → `<script>`)

**Interfaces:** none — behavior unchanged. The existing `heroCanvasInit` sentinel + `astro:after-swap` listener already match the run-once module semantics (same pattern as `Analytics.astro`).

- [ ] Change the script tag; `npm run build`; confirm `dist/` homepage HTML references an external `/_astro/*.js` for the canvas and the inline blob is gone.
- [ ] `npm run test:e2e:smoke` — green (canvas render + VT nav covered by smoke).
- [ ] Manual check: `npm run preview`, homepage animation runs, navigate away/back (VT), no console/CSP errors; commit.

### Task 6: Verify + PRs

- [ ] `npm run verify` at root; worker + worker-csp suites green.
- [ ] Two PRs: site changes (Tasks 1, 2, 5 + this plan doc) and worker changes (Tasks 3, 4) — or one combined if churn is small. Post-merge: curl an old mixed-case tag URL and confirm the 301 with path+query preserved.
