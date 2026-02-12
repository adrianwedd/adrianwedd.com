#!/usr/bin/env bash
set -euo pipefail

# Batch optimise images using Sharp CLI
# Usage: ./scripts/optimise-images.sh [directory]
#
# Converts images to WebP, generates responsive srcsets.
# Requires: npx sharp-cli

DIR="${1:-public/images}"

if [ ! -d "$DIR" ]; then
  echo "Error: Directory '$DIR' not found"
  exit 1
fi

echo "Optimising images in $DIR..."

for img in "$DIR"/*.{jpg,jpeg,png} 2>/dev/null; do
  [ -f "$img" ] || continue
  BASENAME="${img%.*}"

  echo "  Processing: $(basename "$img")"

  # WebP conversion
  npx sharp-cli -i "$img" -o "${BASENAME}.webp" --format webp --quality 80 2>/dev/null || {
    echo "    Warning: sharp-cli not available, skipping optimisation"
    break
  }

  # Responsive sizes
  for width in 400 800 1200; do
    npx sharp-cli -i "$img" -o "${BASENAME}-${width}w.webp" --format webp --quality 80 --width "$width" 2>/dev/null || true
  done
done

echo "Done."
