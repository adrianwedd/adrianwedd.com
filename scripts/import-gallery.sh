#!/usr/bin/env bash
set -euo pipefail

# Import a directory of images as a gallery collection
# Usage: ./scripts/import-gallery.sh <image-directory> ["Collection Title"]
#
# Features:
# - Reads directory name as collection title if not provided
# - Extracts EXIF metadata (camera, date, dimensions) — strips GPS for privacy
# - Auto-generates alt text from filename
# - Supports nested directories (flattened into single collection)
#
# Requires: exiftool (optional, for EXIF extraction)

if [ $# -lt 1 ]; then
  echo "Usage: $0 <image-directory> [\"Collection Title\"]"
  exit 1
fi

IMAGE_DIR="${1%/}"

# Derive title from directory name if not provided
if [ $# -ge 2 ]; then
  TITLE="$2"
else
  TITLE=$(basename "$IMAGE_DIR" | sed 's/[-_]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')
  echo "Using title: $TITLE"
fi

SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
DATE=$(date +%Y-%m-%d)
FILE="src/content/gallery/${SLUG}.md"
DEST_DIR="public/images/gallery/${SLUG}"
HAS_EXIFTOOL=$(command -v exiftool >/dev/null 2>&1 && echo "1" || echo "0")

if [ ! -d "$IMAGE_DIR" ]; then
  echo "Error: Directory '$IMAGE_DIR' not found"
  exit 1
fi

if [ -f "$FILE" ]; then
  echo "Error: $FILE already exists"
  exit 1
fi

mkdir -p "$DEST_DIR"

if [ "$HAS_EXIFTOOL" = "0" ]; then
  echo "Note: Install exiftool for EXIF extraction (brew install exiftool)"
fi

# Suggest tags from existing galleries
echo ""
echo "Popular tags in gallery:"
grep -h '^tags:' src/content/gallery/*.md 2>/dev/null \
  | sed 's/tags: \[//;s/\]//;s/"//g' \
  | tr ',' '\n' \
  | sed 's/^ *//;s/ *$//' \
  | grep -v '^$' \
  | sort | uniq -c | sort -rn | head -10 \
  | awk '{printf "  %s (%d)\n", $2, $1}' 2>/dev/null || true
echo ""

# Find all images (recursive)
IMAGES=""
FIRST_IMAGE=""
COUNT=0

while IFS= read -r -d '' img; do
  [ -f "$img" ] || continue

  BASENAME=$(basename "$img")
  # Sanitize filename
  SAFE_NAME=$(echo "$BASENAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g')
  cp "$img" "$DEST_DIR/$SAFE_NAME"

  if [ -z "$FIRST_IMAGE" ]; then
    FIRST_IMAGE="/images/gallery/${SLUG}/${SAFE_NAME}"
  fi

  # Generate alt text from filename
  ALT=$(echo "${SAFE_NAME%.*}" | sed 's/[-_]/ /g' | sed 's/\b\(.\)/\u\1/g')

  # Extract EXIF if available (strip GPS for privacy)
  CAPTION=""
  if [ "$HAS_EXIFTOOL" = "1" ]; then
    CAMERA=$(exiftool -s3 -Model "$img" 2>/dev/null || echo "")
    EXIF_DATE=$(exiftool -s3 -DateTimeOriginal "$img" 2>/dev/null | cut -d' ' -f1 | tr ':' '-' || echo "")
    DIMS=$(exiftool -s3 -ImageSize "$img" 2>/dev/null || echo "")

    PARTS=()
    [ -n "$CAMERA" ] && PARTS+=("$CAMERA")
    [ -n "$EXIF_DATE" ] && PARTS+=("$EXIF_DATE")
    [ -n "$DIMS" ] && PARTS+=("${DIMS}")

    if [ ${#PARTS[@]} -gt 0 ]; then
      CAPTION=$(IFS=' · '; echo "${PARTS[*]}")
    fi
  fi

  IMAGES="${IMAGES}  - src: \"/images/gallery/${SLUG}/${SAFE_NAME}\"
    alt: \"${ALT}\"
"
  [ -n "$CAPTION" ] && IMAGES="${IMAGES}    caption: \"${CAPTION}\"
"

  COUNT=$((COUNT + 1))
done < <(find "$IMAGE_DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.avif' -o -iname '*.gif' -o -iname '*.svg' \) -print0 | sort -z)

if [ "$COUNT" -eq 0 ]; then
  echo "Error: No image files found in '$IMAGE_DIR'"
  rmdir "$DEST_DIR" 2>/dev/null || true
  exit 1
fi

cat > "$FILE" << EOF
---
title: "${TITLE}"
description: ""
date: ${DATE}
tags: []
images:
${IMAGES}medium: ""
collection: "${SLUG}"
coverImage: "${FIRST_IMAGE}"
---

EOF

echo "Created: $FILE (${COUNT} images)"
echo "Images copied to: $DEST_DIR"
[ "$HAS_EXIFTOOL" = "1" ] && echo "EXIF metadata extracted (GPS stripped)"
