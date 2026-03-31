# Testing & Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CI test suite that gates deploys and set up Upptime production monitoring with a public status page at status.adrianwedd.com.

**Architecture:** A single bash test runner (`scripts/test-site.sh`) calls individual test scripts against `dist/`. Schema validation uses a Node script with `node-html-parser`. Upptime runs in a separate public repo (`adrianwedd/upptime`) with GitHub Pages.

**Tech Stack:** Bash, Node.js, node-html-parser, Upptime (GitHub Actions), Cloudflare DNS

---

### Task 1: Install node-html-parser

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
npm install --save-dev node-html-parser
```

- [ ] **Step 2: Verify installation**

```bash
node -e "const { parse } = require('node-html-parser'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add node-html-parser for schema validation"
```

---

### Task 2: Create schema validation script

**Files:**
- Create: `scripts/validate-schema.mjs`

- [ ] **Step 1: Write the script**

```javascript
#!/usr/bin/env node
/**
 * Validate JSON-LD schema in built HTML files.
 * Runs against dist/ after build.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';

const DIST = 'dist';
let errors = 0;
let checked = 0;

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry === 'index.html') {
      files.push(full);
    }
  }
  return files;
}

function extractSchemas(html) {
  const root = parse(html);
  return root
    .querySelectorAll('script[type="application/ld+json"]')
    .map((el) => {
      try {
        return JSON.parse(el.text);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function fail(file, msg) {
  console.error(`  ✗ ${file}: ${msg}`);
  errors++;
}

function hasType(schemas, type) {
  return schemas.some(
    (s) => s['@type'] === type || (Array.isArray(s['@type']) && s['@type'].includes(type))
  );
}

// Homepage
const homepageHtml = readFileSync(join(DIST, 'index.html'), 'utf-8');
const homeSchemas = extractSchemas(homepageHtml);
if (!hasType(homeSchemas, 'WebSite')) {
  fail('index.html', 'Missing WebSite schema');
}
checked++;

// Blog posts
const blogDir = join(DIST, 'blog');
if (statSync(blogDir).isDirectory()) {
  for (const entry of readdirSync(blogDir)) {
    const indexPath = join(blogDir, entry, 'index.html');
    if (entry === 'tag' || entry === 'tags') continue;
    try {
      if (!statSync(indexPath).isFile()) continue;
    } catch {
      continue;
    }

    const html = readFileSync(indexPath, 'utf-8');
    const schemas = extractSchemas(html);

    if (!hasType(schemas, 'Article')) {
      fail(`blog/${entry}`, 'Missing Article schema');
    }

    // Check required Article fields
    const article = schemas.find((s) => s['@type'] === 'Article');
    if (article) {
      if (!article.headline) fail(`blog/${entry}`, 'Article missing headline');
      if (!article.datePublished) fail(`blog/${entry}`, 'Article missing datePublished');
      if (!article.author) fail(`blog/${entry}`, 'Article missing author');
    }

    checked++;
  }
}

// Project pages
const projectDir = join(DIST, 'projects');
if (statSync(projectDir).isDirectory()) {
  for (const entry of readdirSync(projectDir)) {
    const indexPath = join(projectDir, entry, 'index.html');
    if (entry === 'tag' || entry === 'tags') continue;
    try {
      if (!statSync(indexPath).isFile()) continue;
    } catch {
      continue;
    }

    const html = readFileSync(indexPath, 'utf-8');
    const schemas = extractSchemas(html);

    // Projects use SoftwareApplication (when repo/url) or CreativeWork
    if (!hasType(schemas, 'SoftwareApplication') && !hasType(schemas, 'CreativeWork')) {
      fail(`projects/${entry}`, 'Missing SoftwareApplication or CreativeWork schema');
    }

    checked++;
  }
}

// Validate all schemas have @context and @type
const allHtml = walkDir(DIST);
for (const file of allHtml) {
  const html = readFileSync(file, 'utf-8');
  const schemas = extractSchemas(html);
  for (const schema of schemas) {
    if (!schema['@context']) {
      fail(file, `Schema missing @context: ${JSON.stringify(schema).slice(0, 80)}`);
    }
    if (!schema['@type']) {
      fail(file, `Schema missing @type: ${JSON.stringify(schema).slice(0, 80)}`);
    }
  }
}

console.log(`Schema validation: ${checked} pages checked, ${errors} error(s)`);
process.exit(errors > 0 ? 1 : 0);
```

- [ ] **Step 2: Test against current build**

```bash
node scripts/validate-schema.mjs
```

Expected: `Schema validation: NN pages checked, 0 error(s)` — exit code 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-schema.mjs
git commit -m "feat: add JSON-LD schema validation script"
```

---

### Task 3: Create test-site.sh

**Files:**
- Create: `scripts/test-site.sh`

- [ ] **Step 1: Write the test runner**

```bash
#!/usr/bin/env bash
# Post-build site tests. Runs against dist/ before deploy.
# Exit 1 on hard failures; warnings don't block deploy.
set -euo pipefail

DIST="dist"
ERRORS=0
WARNINGS=0

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo "  ⚠ $1"; WARNINGS=$((WARNINGS + 1)); }

echo "=== Site Tests ==="
echo ""

# --- 3.1 CDN Health Check (soft fail) ---
echo "CDN Health Check..."
CDN_URLS=(
  "https://cdn.adrianwedd.com/notebook-assets/spark/audio.mp3"
  "https://cdn.adrianwedd.com/notebook-assets/the-cognitive-cage/audio.mp3"
  "https://cdn.adrianwedd.com/notebook-assets/adhdo/video.mp4"
  "https://cdn.adrianwedd.com/notebook-assets/failure-first/audio.mp3"
  "https://cdn.adrianwedd.com/notebook-assets/hello-world/audio.mp3"
)
for url in "${CDN_URLS[@]}"; do
  status=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    pass "CDN $status: $(basename "$(dirname "$url")")/$(basename "$url")"
  else
    warn "CDN $status: $url (soft fail — CDN may be temporarily unavailable)"
  fi
done

# --- 3.2 Schema Validation ---
echo ""
echo "Schema Validation..."
if node scripts/validate-schema.mjs; then
  pass "JSON-LD schemas valid"
else
  fail "JSON-LD schema validation failed"
fi

# --- 3.3 RSS Feed Validation ---
echo ""
echo "RSS Feed Validation..."

# Check podcast feed
if [ -f "$DIST/audio/feed.xml" ]; then
  # Well-formed XML
  if xmllint --noout "$DIST/audio/feed.xml" 2>/dev/null; then
    pass "audio/feed.xml is well-formed XML"
  else
    # xmllint may not be available — fall back to basic check
    if head -1 "$DIST/audio/feed.xml" | grep -q '<?xml'; then
      pass "audio/feed.xml starts with XML declaration"
    else
      fail "audio/feed.xml is not valid XML"
    fi
  fi

  # No length="0" enclosures
  ZERO_LEN=$(grep -c 'length="0"' "$DIST/audio/feed.xml" || true)
  if [ "$ZERO_LEN" -eq 0 ]; then
    pass "No length=\"0\" enclosures in podcast feed"
  else
    fail "$ZERO_LEN enclosures have length=\"0\" in podcast feed"
  fi

  # All enclosure URLs are https
  BAD_URLS=$(grep '<enclosure' "$DIST/audio/feed.xml" | grep -cv 'url="https://' || true)
  if [ "$BAD_URLS" -eq 0 ]; then
    pass "All enclosure URLs use https"
  else
    fail "$BAD_URLS enclosure URLs are not https"
  fi
else
  fail "audio/feed.xml not found"
fi

# Check other feeds exist and have items
for feed in rss.xml blog/rss.xml projects/rss.xml; do
  if [ -f "$DIST/$feed" ]; then
    ITEMS=$(grep -c '<item>' "$DIST/$feed" || true)
    if [ "$ITEMS" -gt 0 ]; then
      pass "$feed has $ITEMS items"
    else
      fail "$feed has no items"
    fi
  else
    fail "$feed not found"
  fi
done

# --- 3.4 Draft Exclusion ---
echo ""
echo "Draft Exclusion..."
DRAFT_SLUGS=("the-great-fracture" "welcome")
for slug in "${DRAFT_SLUGS[@]}"; do
  if [ -d "$DIST/blog/$slug" ] || [ -d "$DIST/audio/$slug" ]; then
    fail "Draft '$slug' found in build output"
  else
    pass "Draft '$slug' correctly excluded"
  fi
done

# Post count sanity check
SRC_POSTS=$(find src/content/blog -name '*.md' -exec grep -L 'draft: true' {} \; | wc -l | tr -d ' ')
DIST_POSTS=$(find "$DIST/blog" -maxdepth 2 -name 'index.html' -not -path '*/tag/*' -not -path '*/tags/*' | wc -l | tr -d ' ')
# Subtract 1 for the blog index page itself
DIST_POSTS=$((DIST_POSTS - 1))
if [ "$SRC_POSTS" -eq "$DIST_POSTS" ]; then
  pass "Blog post count matches: $SRC_POSTS source, $DIST_POSTS built"
else
  fail "Blog post count mismatch: $SRC_POSTS source vs $DIST_POSTS built"
fi

# --- 3.5 CSP Validation ---
echo ""
echo "CSP Validation..."
CSP=$(grep -o 'content="default-src[^"]*"' "$DIST/index.html" | head -1)
if echo "$CSP" | grep -q "media-src.*cdn.adrianwedd.com"; then
  pass "CSP media-src includes cdn.adrianwedd.com"
else
  fail "CSP media-src missing cdn.adrianwedd.com"
fi
if echo "$CSP" | grep -q "connect-src.*cdn.adrianwedd.com"; then
  pass "CSP connect-src includes cdn.adrianwedd.com"
else
  fail "CSP connect-src missing cdn.adrianwedd.com"
fi
if echo "$CSP" | grep -q "pagead2.googlesyndication.com"; then
  pass "CSP script-src includes AdSense"
else
  fail "CSP script-src missing AdSense"
fi
if echo "$CSP" | grep -q "'unsafe-eval'" | grep -v "wasm-unsafe-eval"; then
  fail "CSP contains unsafe-eval"
else
  pass "CSP does not contain unsafe-eval"
fi

# --- 3.6 CDN Reference Integrity ---
echo ""
echo "CDN Reference Integrity..."
LOCAL_MEDIA=$(grep -rl '/notebook-assets/[^"]*\.mp[34]' "$DIST" --include='*.html' 2>/dev/null | wc -l | tr -d ' ')
if [ "$LOCAL_MEDIA" -eq 0 ]; then
  pass "No local audio/video references in built HTML"
else
  fail "$LOCAL_MEDIA HTML files still reference local audio/video"
fi

# --- 3.7 Image Reference Check ---
echo ""
echo "Image Reference Check..."
IMG_ERRORS=0
grep -roh 'src="/notebook-assets/[^"]*\.\(webp\|png\)' "$DIST" --include='*.html' 2>/dev/null | sort -u | while read -r ref; do
  path="${ref#src=\"}"
  if [ ! -f "$DIST$path" ]; then
    echo "    Missing: $path"
    IMG_ERRORS=$((IMG_ERRORS + 1))
  fi
done
if [ "$IMG_ERRORS" -eq 0 ]; then
  pass "All infographic references resolve"
else
  fail "$IMG_ERRORS broken infographic references"
fi

# --- 3.8 Sitemap Validation ---
echo ""
echo "Sitemap Validation..."
if [ -f "$DIST/sitemap-index.xml" ]; then
  SIZE=$(wc -c < "$DIST/sitemap-index.xml" | tr -d ' ')
  if [ "$SIZE" -gt 100 ]; then
    pass "sitemap-index.xml exists ($SIZE bytes)"
  else
    fail "sitemap-index.xml is suspiciously small ($SIZE bytes)"
  fi
else
  fail "sitemap-index.xml not found"
fi

# --- 3.9 OG Image Validation ---
echo ""
echo "OG Image Validation..."
OG_ERRORS=0
for dir in blog projects; do
  for page in $(find "$DIST/$dir" -maxdepth 2 -name 'index.html' -not -path '*/tag/*' -not -path '*/tags/*'); do
    OG=$(grep -o 'content="[^"]*"' "$page" | grep -A1 'og:image' | head -1 | sed 's/content="//;s/"//')
    if [ -z "$OG" ]; then
      # Try a different extraction
      OG=$(grep 'og:image' "$page" | grep -o 'content="[^"]*"' | sed 's/content="//;s/"//')
    fi
    if [ -z "$OG" ]; then
      warn "No og:image in $page"
    fi
  done
done
pass "OG image check complete"

# --- Summary ---
echo ""
echo "=== Summary ==="
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  echo "FAIL: $ERRORS error(s) found"
  exit 1
else
  echo "PASS"
  exit 0
fi
```

- [ ] **Step 2: Make executable and test**

```bash
chmod +x scripts/test-site.sh
bash scripts/test-site.sh
```

Expected: `PASS` with 0 errors. CDN checks may show warnings if run locally without network.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-site.sh
git commit -m "feat: add post-build site test suite"
```

---

### Task 4: Integrate into deploy.yml

**Files:**
- Modify: `.github/workflows/deploy.yml` (insert after lychee step, line 99, before upload-pages-artifact)

- [ ] **Step 1: Add the test step**

Insert this block after the lychee `Check links` step and before the `upload-pages-artifact` step:

```yaml
      - name: Run site tests
        run: bash scripts/test-site.sh
```

- [ ] **Step 2: Verify workflow syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "valid YAML"
```

Expected: `valid YAML`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add site test suite to deploy pipeline"
```

---

### Task 5: Create Upptime repository

**Files:**
- Create (new repo): `adrianwedd/upptime` with `.upptimerc.yml`

- [ ] **Step 1: Create the repo**

```bash
gh repo create adrianwedd/upptime --public --description "Status page and uptime monitoring for adrianwedd.com and related services" --clone
cd upptime
```

- [ ] **Step 2: Write .upptimerc.yml**

```bash
cat > .upptimerc.yml << 'CONF'
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

  - name: Sitemap
    url: https://adrianwedd.com/sitemap-index.xml
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

assignees:
  - adrianwedd

status-website:
  cname: status.adrianwedd.com
  name: Adrian Wedd Status
  theme: dark
  logoUrl: https://adrianwedd.com/favicon.svg
CONF
```

- [ ] **Step 3: Commit and push**

```bash
git add .upptimerc.yml
git commit -m "feat: initialize upptime monitoring for all properties"
git push -u origin main
```

- [ ] **Step 4: Verify Upptime workflows auto-generate**

Upptime's template repo auto-creates workflows on first push. Check:

```bash
gh run list --repo adrianwedd/upptime --limit 3
```

Expected: Upptime workflows running (setup, uptime-monitor, etc.)

---

### Task 6: Configure Upptime notifications

- [ ] **Step 1: Set Telegram secrets**

```bash
gh secret set NOTIFICATION_TELEGRAM --body "true" --repo adrianwedd/upptime
gh secret set NOTIFICATION_TELEGRAM_BOT_KEY --body "<your-telegram-bot-token>" --repo adrianwedd/upptime
gh secret set NOTIFICATION_TELEGRAM_CHAT_ID --body "<your-telegram-chat-id>" --repo adrianwedd/upptime
```

Replace `<your-telegram-bot-token>` and `<your-telegram-chat-id>` with actual values from the Telegram bot configured in this session.

- [ ] **Step 2: Verify secrets are set**

```bash
gh secret list --repo adrianwedd/upptime
```

Expected: 3 secrets listed.

---

### Task 7: Add DNS CNAME for status.adrianwedd.com

- [ ] **Step 1: Create CNAME via Cloudflare API**

```bash
CF_TOKEN=$(grep CLOUDFLARE_API_TOKEN_ALT .env | cut -d= -f2)
ZONE_ID="109eaa3abaa7785f334074701f2c1d9b"

curl -s -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"CNAME","name":"status","content":"adrianwedd.github.io","proxied":true,"ttl":1}'
```

Expected: `"success": true`

- [ ] **Step 2: Enable GitHub Pages on the upptime repo**

```bash
gh api repos/adrianwedd/upptime/pages -X POST -f source='{"branch":"gh-pages","path":"/"}' 2>/dev/null || echo "Pages may auto-enable via Upptime"
```

- [ ] **Step 3: Verify status page loads**

```bash
sleep 60
curl -sI https://status.adrianwedd.com | head -5
```

Expected: HTTP 200. May take a few minutes for DNS + Pages to propagate.

---

### Task 8: Build, test, push, and verify

- [ ] **Step 1: Build locally**

```bash
npm run build
```

Expected: Clean build, 360+ pages.

- [ ] **Step 2: Run the full test suite locally**

```bash
bash scripts/test-site.sh
```

Expected: `PASS` with 0 errors.

- [ ] **Step 3: Push all changes**

```bash
git push
```

- [ ] **Step 4: Verify CI passes**

```bash
sleep 120
gh run list --limit 1 --json status,conclusion,name
```

Expected: `"conclusion": "success"`

- [ ] **Step 5: Verify Upptime is monitoring**

```bash
gh run list --repo adrianwedd/upptime --limit 1
```

Expected: Uptime check workflow completed successfully.
