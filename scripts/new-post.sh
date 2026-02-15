#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new blog post with smart tag suggestions
# Usage: ./scripts/new-post.sh "Post Title" [--tags tag1,tag2]

if [ $# -eq 0 ]; then
  echo "Usage: $0 \"Post Title\" [--tags tag1,tag2]"
  exit 1
fi

TITLE="$1"
shift
TAGS_ARG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --tags) TAGS_ARG="$2"; shift 2 ;;
    *) shift ;;
  esac
done

SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
DATE=$(date +%Y-%m-%d)
FILE="src/content/blog/${SLUG}.md"

if [ -f "$FILE" ]; then
  echo "Error: $FILE already exists"
  exit 1
fi

# Suggest tags from existing posts if none provided
if [ -z "$TAGS_ARG" ]; then
  echo "Popular tags in blog:"
  grep -h '^tags:' src/content/blog/*.md 2>/dev/null \
    | sed 's/tags: \[//;s/\]//;s/"//g' \
    | tr ',' '\n' \
    | sed 's/^ *//;s/ *$//' \
    | grep -v '^$' \
    | sort | uniq -c | sort -rn | head -15 \
    | awk '{printf "  %s (%d)\n", $2, $1}'
  echo ""
  echo "Pass --tags tag1,tag2 to pre-fill, or edit the file after creation."
  TAGS_LINE='tags: []'
else
  # Format tags as YAML array
  TAGS_LINE="tags: [$(echo "$TAGS_ARG" | sed 's/,/, /g' | sed 's/[^,]*/"&"/g' | sed 's/" /"/g')]"
fi

cat > "$FILE" << EOF
---
title: "${TITLE}"
description: ""
date: ${DATE}
${TAGS_LINE}
draft: true
---

EOF

echo "Created: $FILE"
echo "Open it and start writing."
