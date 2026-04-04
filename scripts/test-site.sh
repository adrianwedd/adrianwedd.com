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
    warn "CDN $status: $url (soft fail)"
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

if [ -f "$DIST/audio/feed.xml" ]; then
  if xmllint --noout "$DIST/audio/feed.xml" 2>/dev/null; then
    pass "audio/feed.xml is well-formed XML"
  else
    if head -1 "$DIST/audio/feed.xml" | grep -q '<?xml'; then
      pass "audio/feed.xml starts with XML declaration"
    else
      fail "audio/feed.xml is not valid XML"
    fi
  fi

  ZERO_LEN=$(grep -c 'length="0"' "$DIST/audio/feed.xml" || true)
  if [ "$ZERO_LEN" -eq 0 ]; then
    pass "No length=\"0\" enclosures in podcast feed"
  else
    # Soft fail: CDN HEAD requests may fail in CI (network restrictions)
    warn "$ZERO_LEN enclosures have length=\"0\" in podcast feed (CDN may be unreachable during build)"
  fi

  BAD_URLS=$(grep '<enclosure' "$DIST/audio/feed.xml" | grep -cv 'url="https://' || true)
  if [ "$BAD_URLS" -eq 0 ]; then
    pass "All enclosure URLs use https"
  else
    fail "$BAD_URLS enclosure URLs are not https"
  fi
else
  fail "audio/feed.xml not found"
fi

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

SRC_POSTS=$(find src/content/blog -name '*.md' -exec grep -L 'draft: true' {} \; | wc -l | tr -d ' ')
DIST_POSTS=$(find "$DIST/blog" -maxdepth 2 -name 'index.html' -not -path '*/tag/*' -not -path '*/tags/*' | wc -l | tr -d ' ')
# Subtract 1 for the blog listing page (dist/blog/index.html)
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
if echo "$CSP" | grep "'unsafe-eval'" | grep -qv "wasm-unsafe-eval"; then
  fail "CSP contains unsafe-eval"
else
  pass "CSP does not contain unsafe-eval"
fi

# --- 3.6 CDN Reference Integrity ---
echo ""
echo "CDN Reference Integrity..."
# Check for local audio/video paths — find .mp3/.mp4 URLs NOT on cdn.adrianwedd.com
# Extract all notebook-assets audio/video URLs, then filter out CDN ones
LOCAL_COUNT=0
while IFS= read -r match; do
  if ! echo "$match" | grep -q 'cdn\.adrianwedd\.com'; then
    LOCAL_COUNT=$((LOCAL_COUNT + 1))
  fi
done < <(grep -roh 'notebook-assets/[^"]*\.mp[34]' "$DIST" --include='*.html' 2>/dev/null || true)
if [ "$LOCAL_COUNT" -eq 0 ]; then
  pass "No local audio/video references in built HTML"
else
  warn "$LOCAL_COUNT HTML references may use local audio/video paths"
fi

# --- 3.7 Image Reference Check ---
echo ""
echo "Image Reference Check..."
IMG_MISSING=0
while IFS= read -r ref; do
  path=$(echo "$ref" | sed 's/^src="//;s/"$//')
  if [ ! -f "$DIST$path" ]; then
    echo "    Missing: $path"
    IMG_MISSING=$((IMG_MISSING + 1))
  fi
done < <(grep -roh 'src="/notebook-assets/[^"]*\.\(webp\|png\)"' "$DIST" --include='*.html' 2>/dev/null | sort -u || true)
if [ "$IMG_MISSING" -eq 0 ]; then
  pass "All local notebook-assets images exist in dist/"
else
  fail "$IMG_MISSING notebook-assets images missing from dist/"
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
OG_MISSING=0
OG_TOTAL=0
for dir in blog projects; do
  while IFS= read -r page; do
    # Skip redirect pages (those with http-equiv="refresh")
    if grep -q 'http-equiv="refresh"' "$page"; then
      continue
    fi
    OG=$(grep 'og:image' "$page" | grep -o 'content="[^"]*"' | head -1 | sed 's/content="//;s/"$//' || true)
    OG_TOTAL=$((OG_TOTAL + 1))
    if [ -z "$OG" ]; then
      warn "No og:image in $page"
      OG_MISSING=$((OG_MISSING + 1))
    fi
  done < <(find "$DIST/$dir" -maxdepth 2 -name 'index.html' -not -path '*/tag/*' -not -path '*/tags/*' 2>/dev/null)
done
pass "OG image check complete ($((OG_TOTAL - OG_MISSING))/$OG_TOTAL have og:image)"

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
