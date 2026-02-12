#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new project page
# Usage: ./scripts/new-project.sh "Project Title" [repo-name]

if [ $# -eq 0 ]; then
  echo "Usage: $0 \"Project Title\" [repo-name]"
  exit 1
fi

TITLE="$1"
REPO="${2:-}"
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
DATE=$(date +%Y-%m-%d)
FILE="src/content/projects/${SLUG}.md"

if [ -f "$FILE" ]; then
  echo "Error: $FILE already exists"
  exit 1
fi

cat > "$FILE" << EOF
---
title: "${TITLE}"
description: ""
tags: []
${REPO:+repo: "${REPO}"}
status: "active"
featured: false
date: ${DATE}
---

EOF

echo "Created: $FILE"
