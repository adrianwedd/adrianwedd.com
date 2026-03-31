#!/usr/bin/env bash
# Upload audio + video from public/notebook-assets/ to R2 via Cloudflare API.
# Uses curl directly (no wrangler dependency, handles large files).
#
# Usage: ./scripts/upload-media-to-r2.sh [--dry-run] [--retry-failed]

set -euo pipefail

DRY_RUN=false
RETRY_FAILED=false
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --retry-failed) RETRY_FAILED=true ;;
  esac
done

BUCKET="adrianwedd-com-media"
ASSETS_DIR="public/notebook-assets"
ACCOUNT_ID="eb44f406e11df8adec20cc1e7b66f151"
MAX_RETRIES=3
FAILED_LOG="/tmp/r2-upload-failed.txt"

# Load R2 token
if [ -z "${CF_R2_API_TOKEN:-}" ]; then
  if [ -f .env ]; then
    CF_R2_API_TOKEN=$(grep CF_R2_API_TOKEN .env | head -1 | cut -d= -f2)
  fi
fi

if [ -z "${CF_R2_API_TOKEN:-}" ]; then
  echo "ERROR: CF_R2_API_TOKEN not set"
  exit 1
fi

UPLOADED=0
FAILED=0
SKIPPED=0

: > "$FAILED_LOG"

upload_file() {
  local file="$1"
  local key="$2"
  local attempt=1
  local size
  size=$(du -h "$file" | cut -f1)

  while [ $attempt -le $MAX_RETRIES ]; do
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
      -X PUT \
      "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${key}" \
      -H "Authorization: Bearer ${CF_R2_API_TOKEN}" \
      -H "Content-Type: application/octet-stream" \
      --data-binary "@${file}" \
      --max-time 600)

    if [ "$http_code" = "200" ]; then
      echo "  ✓ $key ($size)"
      return 0
    fi

    echo "    HTTP $http_code — retry $attempt/$MAX_RETRIES..."
    sleep $((attempt * 3))
    attempt=$((attempt + 1))
  done

  echo "  ✗ FAILED: $key ($size)"
  echo "$file|$key" >> "$FAILED_LOG"
  return 1
}

# If retrying, only process previously failed files
if [ "$RETRY_FAILED" = true ] && [ -f "$FAILED_LOG" ]; then
  echo "=== Retrying $(wc -l < "$FAILED_LOG" | tr -d ' ') failed uploads ==="
  while IFS='|' read -r file key; do
    [ -z "$file" ] && continue
    echo "Retrying: $key"
    upload_file "$file" "$key" && UPLOADED=$((UPLOADED + 1)) || FAILED=$((FAILED + 1))
  done < "$FAILED_LOG"
else
  echo "=== Uploading audio + video to R2: $BUCKET ==="
  echo ""

  # Get list of already-uploaded keys
  EXISTING_KEYS="/tmp/r2-existing-keys.txt"
  curl -s "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects" \
    -H "Authorization: Bearer ${CF_R2_API_TOKEN}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for o in d.get('result', []):
    print(o['key'])" > "$EXISTING_KEYS" 2>/dev/null

  for file in $(find "$ASSETS_DIR" -type f \( -name "audio.mp3" -o -name "video.mp4" \) | sort); do
    key="${file#public/}"

    if [ "$DRY_RUN" = true ]; then
      size=$(du -h "$file" | cut -f1)
      echo "[DRY] $key ($size)"
      UPLOADED=$((UPLOADED + 1))
      continue
    fi

    # Skip if already uploaded
    if grep -q "^${key}$" "$EXISTING_KEYS" 2>/dev/null; then
      echo "  ⊘ skip (exists): $key"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    upload_file "$file" "$key" && UPLOADED=$((UPLOADED + 1)) || FAILED=$((FAILED + 1))
  done
fi

echo ""
echo "=== Summary ==="
echo "Uploaded: $UPLOADED"
echo "Skipped:  $SKIPPED"
echo "Failed:   $FAILED"
[ -s "$FAILED_LOG" ] && echo "Failed list: $FAILED_LOG (use --retry-failed to retry)"
