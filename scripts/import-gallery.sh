#!/usr/bin/env bash
set -euo pipefail

# Import a directory of images as a gallery collection
# Usage: ./scripts/import-gallery.sh <image-directory> "Collection Title"
#
# Creates a markdown file in src/content/gallery/ with image metadata
# and optionally optimises images via Sharp.

if [ $# -lt 2 ]; then
  echo "Usage: $0 <image-directory> \"Collection Title\""
  exit 1
fi

IMAGE_DIR="$1"
TITLE="$2"
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
DATE=$(date +%Y-%m-%d)
FILE="src/content/gallery/${SLUG}.md"
DEST_DIR="public/images/gallery/${SLUG}"

if [ ! -d "$IMAGE_DIR" ]; then
  echo "Error: Directory '$IMAGE_DIR' not found"
  exit 1
fi

if [ -f "$FILE" ]; then
  echo "Error: $FILE already exists"
  exit 1
fi

mkdir -p "$DEST_DIR"

# Copy and build image list
IMAGES=""
FIRST_IMAGE=""
for img in "$IMAGE_DIR"/*.{jpg,jpeg,png,webp,avif,gif,svg} 2>/dev/null; do
  [ -f "$img" ] || continue
  BASENAME=$(basename "$img")
  cp "$img" "$DEST_DIR/"

  if [ -z "$FIRST_IMAGE" ]; then
    FIRST_IMAGE="/images/gallery/${SLUG}/${BASENAME}"
  fi

  IMAGES="${IMAGES}  - src: \"/images/gallery/${SLUG}/${BASENAME}\"
    alt: \"${BASENAME%.*}\"
"
done

if [ -z "$IMAGES" ]; then
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

echo "Created: $FILE"
echo "Images copied to: $DEST_DIR"
echo "Run ./scripts/optimise-images.sh $DEST_DIR to optimise"
