# Testing & Observability Design

**Status:** Approved — 2026-03-31
**Scope:** CI test suite + production monitoring + public status page

---

## 1. Problem

The site has no automated tests beyond build + lychee link check + Lighthouse (PR-only). After the R2 CDN migration, there's no way to detect CDN outages, broken RSS feeds, invalid schema, or draft leaks before or after deploy. No production monitoring or alerting exists.

## 2. Properties to Monitor

| Property | URL | Type |
|----------|-----|------|
| Main site | `https://adrianwedd.com` | GitHub Pages |
| CDN | `https://cdn.adrianwedd.com` | Cloudflare R2 |
| Social worker | `https://social.adrianwedd.com/api/health` | Cloudflare Worker |
| Failure First | `https://failurefirst.org` | GitHub Pages |
| Evolve Chiropractic | `https://evolvechiropractictas.com` | CF Pages |
| Status page | `https://status.adrianwedd.com` | GitHub Pages (Upptime) |

## 3. CI Test Suite

### Location
`scripts/test-site.sh` — runs against `dist/` after build, before deploy.

### Integration
Add as a step in `.github/workflows/deploy.yml` between build and upload:

```yaml
- name: Run site tests
  run: bash scripts/test-site.sh
```

### Tests

#### 3.1 CDN Health Check
Curl 5 representative CDN URLs. Assert HTTP 200 for each.

```
https://cdn.adrianwedd.com/notebook-assets/spark/audio.mp3
https://cdn.adrianwedd.com/notebook-assets/the-cognitive-cage/audio.mp3
https://cdn.adrianwedd.com/notebook-assets/adhdo/video.mp4
https://cdn.adrianwedd.com/notebook-assets/failure-first/audio.mp3
https://cdn.adrianwedd.com/notebook-assets/hello-world/audio.mp3
```

HEAD requests only. Fail the build if any return non-200. Timeout: 10s per URL.

#### 3.2 Schema Validation
Parse JSON-LD `<script type="application/ld+json">` from built HTML files. Validate:
- Homepage has `WebSite` schema
- Blog posts have `Article` schema with required fields (headline, datePublished, author)
- Blog posts with `faq` frontmatter have `FAQPage` schema
- Project pages have `SoftwareApplication` schema
- All schemas have valid `@context` and `@type`

Implementation: Node script (`scripts/validate-schema.mjs`) that reads `dist/**/*.html`, extracts JSON-LD blocks, and validates structure.

#### 3.3 RSS Feed Validation
Parse `dist/audio/feed.xml`:
- Well-formed XML
- All `<enclosure>` elements have `length` > 0
- All `<enclosure url="">` values start with `https://`
- No empty `<title>` or `<description>` elements

Parse `dist/rss.xml`, `dist/blog/rss.xml`, `dist/projects/rss.xml`:
- Well-formed XML
- At least 1 item each

#### 3.4 Draft Exclusion
Grep `dist/` for known draft slugs:
- `the-great-fracture` (current draft blog post)
- `welcome` (current draft audio)

Assert none appear as directories in `dist/blog/` or `dist/audio/`.

Also: count HTML files in `dist/blog/` and compare against non-draft blog posts in `src/content/blog/`. Numbers must match.

#### 3.5 CSP Validation
Extract the CSP meta tag from `dist/index.html`. Assert:
- `media-src` includes `https://cdn.adrianwedd.com`
- `connect-src` includes `https://cdn.adrianwedd.com`
- `script-src` includes `https://pagead2.googlesyndication.com` (AdSense)
- No `unsafe-eval` (only `wasm-unsafe-eval` is acceptable)

#### 3.6 CDN Reference Integrity
Grep all HTML files in `dist/` for `/notebook-assets/` followed by `.mp3` or `.mp4`. Assert zero matches. All audio/video must point to CDN, not local paths.

#### 3.7 Image Reference Check
Grep all HTML files in `dist/` for `src="/notebook-assets/`. Assert all referenced `.webp` and `.png` files exist in `dist/notebook-assets/`. Catches broken infographic references.

### Existing Checks (already in deploy.yml, keep as-is)
- `node scripts/validate-content.js` — frontmatter validation
- `npm audit --audit-level=high --omit=dev` — dependency audit
- Build size budget (`dist/_astro/` ≤ 100MB)
- No raw `<img>` on local paths
- Lychee link check

## 4. Production Monitoring (Upptime)

### Repository
`adrianwedd/upptime` — public repo on GitHub.

### Configuration (`.upptimerc.yml`)

```yaml
owner: adrianwedd
repo: upptime

sites:
  - name: adrianwedd.com
    url: https://adrianwedd.com
    expectedStatusCodes:
      - 200

  - name: CDN (audio)
    url: https://cdn.adrianwedd.com/notebook-assets/spark/audio.mp3
    method: HEAD
    expectedStatusCodes:
      - 200

  - name: CDN (infographic)
    url: https://cdn.adrianwedd.com/notebook-assets/spark/infographic.webp
    method: HEAD
    expectedStatusCodes:
      - 200

  - name: Social Worker
    url: https://social.adrianwedd.com/api/health
    expectedStatusCodes:
      - 200

  - name: Failure First
    url: https://failurefirst.org
    expectedStatusCodes:
      - 200

  - name: Evolve Chiropractic
    url: https://evolvechiropractictas.com
    expectedStatusCodes:
      - 200

  - name: Podcast RSS
    url: https://adrianwedd.com/audio/feed.xml
    expectedStatusCodes:
      - 200

  - name: Blog RSS
    url: https://adrianwedd.com/blog/rss.xml
    expectedStatusCodes:
      - 200

status-website:
  cname: status.adrianwedd.com
  name: Adrian Wedd Status
  theme: dark
  logoUrl: https://adrianwedd.com/favicon.svg

notifications:
  - type: telegram
    botToken: $TELEGRAM_BOT_TOKEN
    chatId: $TELEGRAM_CHAT_ID

  - type: issues
    repo: adrianwedd/upptime
    assignees:
      - adrianwedd
    labels:
      - incident

cron: "*/15 * * * *"
```

### How Upptime Works
- GitHub Actions cron runs every 15 minutes
- Pings each URL, records response time and status
- Commits results to the repo (public history)
- On failure: creates a GitHub Issue labeled `incident` + sends Telegram notification
- On recovery: closes the issue + sends recovery notification
- Generates a static status page deployed to GitHub Pages at `status.adrianwedd.com`

### DNS
Add CNAME record: `status` → `adrianwedd.github.io` (proxied via Cloudflare).

## 5. Cloudflare Monitoring (Secondary)

Use Cloudflare's built-in Health Checks (free tier, 1 check per origin):
- Monitor `adrianwedd.com` from CF edge
- Email notification on failure
- Acts as independent verification — if both Upptime AND CF detect an outage, it's real

Configuration via CF dashboard or API. No code changes needed.

## 6. Alerting Flow

```
Site down
  ├─ Upptime detects (within 15 min)
  │   ├─ Telegram notification (immediate)
  │   └─ GitHub Issue created (tracking)
  │
  └─ Cloudflare Health Check detects
      └─ Email notification

Site recovers
  ├─ Upptime detects
  │   ├─ Telegram recovery message
  │   └─ GitHub Issue closed
  │
  └─ Cloudflare clears alert
```

## 7. Status Page Features

Public at `status.adrianwedd.com`:
- Overall status (all systems operational / partial outage / major outage)
- Per-service status with uptime percentage (90 days)
- Response time graphs
- Incident history with timestamps
- Dark theme matching adrianwedd.com aesthetic

## 8. Implementation Order

1. Create `scripts/test-site.sh` with all CI tests
2. Create `scripts/validate-schema.mjs` for JSON-LD validation
3. Integrate into `deploy.yml`
4. Create `adrianwedd/upptime` repo with `.upptimerc.yml`
5. Configure Telegram bot token + chat ID as repo secrets
6. Add DNS CNAME for `status.adrianwedd.com`
7. Configure Cloudflare Health Check via dashboard
8. Verify all monitors fire and alert correctly

## 9. What This Doesn't Cover (Intentionally)

- **APM/tracing** — overkill for static sites
- **Error tracking (Sentry)** — no server-side code to track; client JS errors are minimal (Preact islands)
- **Log aggregation** — GitHub Pages has no server logs; CF analytics covers traffic
- **Load testing** — static site behind CF CDN, not a concern
- **Visual regression testing** — Lighthouse covers layout shifts; pixel-diff testing is expensive for the value
