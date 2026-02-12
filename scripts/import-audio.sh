#!/usr/bin/env bash
set -euo pipefail

# Import an audio file as a podcast episode
# Usage: ./scripts/import-audio.sh <audio-file> "Episode Title"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <audio-file> \"Episode Title\""
  exit 1
fi

AUDIO_FILE="$1"
TITLE="$2"
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
DATE=$(date +%Y-%m-%d)
FILE="src/content/audio/${SLUG}.md"
DEST="public/audio/${SLUG}.mp3"

if [ ! -f "$AUDIO_FILE" ]; then
  echo "Error: File '$AUDIO_FILE' not found"
  exit 1
fi

if [ -f "$FILE" ]; then
  echo "Error: $FILE already exists"
  exit 1
fi

mkdir -p public/audio
cp "$AUDIO_FILE" "$DEST"

# Get duration if ffprobe is available
DURATION=""
if command -v ffprobe &> /dev/null; then
  SECONDS=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$DEST" 2>/dev/null | cut -d. -f1)
  if [ -n "$SECONDS" ]; then
    MINS=$((SECONDS / 60))
    SECS=$((SECONDS % 60))
    DURATION=$(printf "%d:%02d" "$MINS" "$SECS")
  fi
fi

cat > "$FILE" << EOF
---
title: "${TITLE}"
description: ""
date: ${DATE}
tags: []
audioUrl: "/audio/${SLUG}.mp3"
${DURATION:+duration: "${DURATION}"}
---

EOF

echo "Created: $FILE"
echo "Audio copied to: $DEST"
