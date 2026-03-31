#!/usr/bin/env bash
# Re-download all NotebookLM assets (audio + infographics) without watermarks.
# Requires: nlm CLI authenticated, ffmpeg for audio compression.
#
# Usage: ./scripts/redownload-nlm-assets.sh [--dry-run] [--audio-only] [--infographic-only]
#
# Downloads to /tmp/nlm-redownload/ then replaces public/notebook-assets/ files.

set -euo pipefail

DRY_RUN=false
AUDIO_ONLY=false
INFOGRAPHIC_ONLY=false
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --audio-only) AUDIO_ONLY=true ;;
    --infographic-only) INFOGRAPHIC_ONLY=true ;;
  esac
done

DOWNLOAD_DIR="/tmp/nlm-redownload"
ASSETS_DIR="public/notebook-assets"
NOTEBOOKS_FILE="/tmp/nlm-notebooks-map.txt"

mkdir -p "$DOWNLOAD_DIR"

echo "=== Fetching notebook list ==="
nlm notebook list --title > "$NOTEBOOKS_FILE" 2>/dev/null

# Build slug → notebook ID mapping for audio
# Notebooks are named like: "{slug} audio" or "{Title} - Audio Overview" or "{Title} - Overview"
find_notebook_id() {
  local slug="$1"
  local type="$2"  # "audio" or "infographic"
  local id=""

  if [ "$type" = "audio" ]; then
    # Try "{slug} audio" pattern first (most common)
    id=$(grep -i "^[a-f0-9-]*: ${slug} audio$" "$NOTEBOOKS_FILE" | head -1 | cut -d: -f1)
    if [ -z "$id" ]; then
      # Try "- Audio Overview" pattern
      id=$(grep -i "Audio Overview" "$NOTEBOOKS_FILE" | grep -i "${slug//-/.*}" | head -1 | cut -d: -f1)
    fi
    if [ -z "$id" ]; then
      # Try "- Overview" pattern
      id=$(grep -i "Overview" "$NOTEBOOKS_FILE" | grep -i "${slug//-/.*}" | head -1 | cut -d: -f1)
    fi
  elif [ "$type" = "infographic" ]; then
    # Try "{Title} - Infographic" pattern
    id=$(grep -i "Infographic" "$NOTEBOOKS_FILE" | grep -i "${slug//-/.*}" | head -1 | cut -d: -f1)
    if [ -z "$id" ]; then
      # Try the slug-based notebooks (often used for both audio and infographic)
      id=$(grep -i "^[a-f0-9-]*: ${slug}$" "$NOTEBOOKS_FILE" | head -1 | cut -d: -f1)
    fi
    if [ -z "$id" ]; then
      # Try "- Overview" pattern (infographics sometimes in overview notebooks)
      id=$(grep -i "Overview" "$NOTEBOOKS_FILE" | grep -i "${slug//-/.*}" | head -1 | cut -d: -f1)
    fi
  fi

  echo "$id"
}

AUDIO_OK=0
AUDIO_FAIL=0
INFOGRAPHIC_OK=0
INFOGRAPHIC_FAIL=0

for dir in "$ASSETS_DIR"/*/; do
  slug=$(basename "$dir")

  # Skip subdirectories (failure-first/jailbreak-archaeology etc.)
  [ -d "$dir/jailbreak-archaeology" ] && continue
  [ -d "$dir/moltbook" ] && continue

  # === AUDIO ===
  if [ "$INFOGRAPHIC_ONLY" = false ] && [ -f "$dir/audio.mp3" ]; then
    nb_id=$(find_notebook_id "$slug" "audio")
    if [ -n "$nb_id" ]; then
      raw_file="$DOWNLOAD_DIR/${slug}-raw.mp3"
      final_file="$DOWNLOAD_DIR/${slug}-audio.mp3"

      if [ "$DRY_RUN" = true ]; then
        echo "[DRY] Audio: $slug → $nb_id"
        AUDIO_OK=$((AUDIO_OK + 1))
      else
        echo "Downloading audio: $slug ($nb_id)..."
        if nlm download audio "$nb_id" --output "$raw_file" 2>/dev/null; then
          # Compress to 64kbps mono MP3 (input may be M4A/DASH despite .mp3 extension)
          ffmpeg -y -i "$raw_file" -vn -ac 1 -ar 44100 -c:a libmp3lame -b:a 64k "$final_file"
          cp "$final_file" "$dir/audio.mp3"
          rm -f "$raw_file"
          echo "  ✓ $slug audio replaced"
          AUDIO_OK=$((AUDIO_OK + 1))
        else
          echo "  ✗ $slug audio download failed"
          AUDIO_FAIL=$((AUDIO_FAIL + 1))
        fi
      fi
    else
      echo "  ? No audio notebook found for: $slug"
      AUDIO_FAIL=$((AUDIO_FAIL + 1))
    fi
  fi

  # === INFOGRAPHIC ===
  if [ "$AUDIO_ONLY" = false ] && [ -f "$dir/infographic.webp" ] || [ -f "$dir/infographic.png" ]; then
    nb_id=$(find_notebook_id "$slug" "infographic")
    if [ -n "$nb_id" ]; then
      raw_file="$DOWNLOAD_DIR/${slug}-infographic.png"
      final_file="$DOWNLOAD_DIR/${slug}-infographic.webp"

      if [ "$DRY_RUN" = true ]; then
        echo "[DRY] Infographic: $slug → $nb_id"
        INFOGRAPHIC_OK=$((INFOGRAPHIC_OK + 1))
      else
        echo "Downloading infographic: $slug ($nb_id)..."
        if nlm download infographic "$nb_id" --output "$raw_file" 2>/dev/null; then
          # Convert to WebP (~150KB vs 6MB PNG)
          if command -v cwebp &>/dev/null; then
            cwebp -q 85 "$raw_file" -o "$final_file" 2>/dev/null
          else
            # Fallback: use ffmpeg
            ffmpeg -y -i "$raw_file" "$final_file" 2>/dev/null
          fi
          if [ -f "$dir/infographic.webp" ]; then
            cp "$final_file" "$dir/infographic.webp"
          elif [ -f "$dir/infographic.png" ]; then
            cp "$final_file" "$dir/infographic.webp"
          fi
          rm -f "$raw_file"
          echo "  ✓ $slug infographic replaced"
          INFOGRAPHIC_OK=$((INFOGRAPHIC_OK + 1))
        else
          echo "  ✗ $slug infographic download failed"
          INFOGRAPHIC_FAIL=$((INFOGRAPHIC_FAIL + 1))
        fi
      fi
    else
      echo "  ? No infographic notebook found for: $slug"
      INFOGRAPHIC_FAIL=$((INFOGRAPHIC_FAIL + 1))
    fi
  fi
done

echo ""
echo "=== Summary ==="
echo "Audio:       $AUDIO_OK ok, $AUDIO_FAIL failed"
echo "Infographic: $INFOGRAPHIC_OK ok, $INFOGRAPHIC_FAIL failed"
echo "Downloads in: $DOWNLOAD_DIR"
