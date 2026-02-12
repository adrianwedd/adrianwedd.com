#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new blog post
# Usage: ./scripts/new-post.sh "Post Title"

if [ $# -eq 0 ]; then
  echo "Usage: $0 \"Post Title\""
  exit 1
fi

TITLE="$1"
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
DATE=$(date +%Y-%m-%d)
FILE="src/content/blog/${SLUG}.md"

if [ -f "$FILE" ]; then
  echo "Error: $FILE already exists"
  exit 1
fi

cat > "$FILE" << EOF
---
title: "${TITLE}"
description: ""
date: ${DATE}
tags: []
draft: true
---

EOF

echo "Created: $FILE"
echo "Open it and start writing."
