#!/usr/bin/env bash
# Migrate public/notebook-assets/ media to R2 (cdn.adrianwedd.com).
# Updates frontmatter references from local paths to CDN URLs.
#
# Usage: ./scripts/migrate-to-r2.sh [--dry-run] [--upload-only] [--rewrite-only]
#
# Requires: wrangler (via npx --prefix worker), CLOUDFLARE_API_TOKEN env var or .env

set -euo pipefail

DRY_RUN=false
UPLOAD_ONLY=false
REWRITE_ONLY=false
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --upload-only) UPLOAD_ONLY=true ;;
    --rewrite-only) REWRITE_ONLY=true ;;
  esac
done

BUCKET="adrianwedd-com-media"
CDN_BASE="https://cdn.adrianwedd.com"
ASSETS_DIR="public/notebook-assets"
WRANGLER="npx --prefix worker wrangler"

# Load token from .env if not in environment
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -f .env ]; then
  export CLOUDFLARE_API_TOKEN=$(grep CF_R2_API_TOKEN .env | cut -d= -f2)
fi

UPLOADED=0
FAILED=0
REWRITTEN=0

# === UPLOAD ===
if [ "$REWRITE_ONLY" = false ]; then
  echo "=== Uploading to R2 bucket: $BUCKET ==="

  for file in $(find "$ASSETS_DIR" -type f \( -name "audio.mp3" -o -name "infographic.webp" -o -name "infographic.png" -o -name "video.mp4" \) | sort); do
    # Convert path: public/notebook-assets/spark/audio.mp3 → notebook-assets/spark/audio.mp3
    r2_key="${file#public/}"

    if [ "$DRY_RUN" = true ]; then
      echo "[DRY] Upload: $file → $r2_key"
      UPLOADED=$((UPLOADED + 1))
    else
      echo "Uploading: $r2_key"
      if $WRANGLER r2 object put "$BUCKET/$r2_key" --file "$file" --remote 2>/dev/null; then
        UPLOADED=$((UPLOADED + 1))
      else
        echo "  ✗ Failed: $r2_key"
        FAILED=$((FAILED + 1))
      fi
    fi
  done

  echo ""
  echo "Upload: $UPLOADED ok, $FAILED failed"
fi

# === REWRITE FRONTMATTER ===
if [ "$UPLOAD_ONLY" = false ]; then
  echo ""
  echo "=== Rewriting frontmatter references ==="

  # Pattern: /notebook-assets/foo/bar → https://cdn.adrianwedd.com/notebook-assets/foo/bar
  LOCAL_PREFIX="/notebook-assets/"
  CDN_PREFIX="$CDN_BASE/notebook-assets/"

  for mdfile in src/content/blog/*.md src/content/projects/*.md src/content/audio/*.md src/content/gallery/*.md; do
    [ -f "$mdfile" ] || continue

    if grep -q "$LOCAL_PREFIX" "$mdfile"; then
      if [ "$DRY_RUN" = true ]; then
        count=$(grep -c "$LOCAL_PREFIX" "$mdfile")
        echo "[DRY] Rewrite $count refs in: $mdfile"
        REWRITTEN=$((REWRITTEN + count))
      else
        sed -i '' "s|${LOCAL_PREFIX}|${CDN_PREFIX}|g" "$mdfile"
        count=$(grep -c "$CDN_PREFIX" "$mdfile" || true)
        REWRITTEN=$((REWRITTEN + count))
        echo "  ✓ $mdfile ($count refs)"
      fi
    fi
  done

  echo ""
  echo "Rewritten: $REWRITTEN references"
fi

echo ""
echo "=== Done ==="
if [ "$DRY_RUN" = false ] && [ "$UPLOAD_ONLY" = false ]; then
  echo ""
  echo "Next steps:"
  echo "  1. Run: npm run build    (verify build passes)"
  echo "  2. Test a CDN URL:  curl -I ${CDN_BASE}/notebook-assets/spark/audio.mp3"
  echo "  3. Add to .gitignore:  echo 'public/notebook-assets/' >> .gitignore"
  echo "  4. Remove from git:  git rm -r --cached public/notebook-assets/"
  echo "  5. Commit the migration"
fi
