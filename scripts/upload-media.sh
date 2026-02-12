#!/usr/bin/env bash
set -euo pipefail

# Upload media assets to Cloudflare R2
# Usage: ./scripts/upload-media.sh [directory]
#
# Syncs local media files to the R2 bucket.
# Requires: wrangler CLI authenticated with Cloudflare.

BUCKET_NAME="adrianwedd-media"
SOURCE_DIR="${1:-./media}"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory '$SOURCE_DIR' does not exist."
  echo "Usage: $0 [directory]"
  exit 1
fi

if ! command -v wrangler &> /dev/null; then
  echo "Error: wrangler CLI not found. Install with: npm install -g wrangler"
  exit 1
fi

echo "Uploading media from $SOURCE_DIR to R2 bucket: $BUCKET_NAME"

find "$SOURCE_DIR" -type f | while read -r file; do
  key="${file#"$SOURCE_DIR"/}"
  echo "  Uploading: $key"
  wrangler r2 object put "$BUCKET_NAME/$key" --file "$file"
done

echo "Upload complete."
