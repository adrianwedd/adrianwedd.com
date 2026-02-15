#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new project page with smart defaults
# Usage: ./scripts/new-project.sh "Project Title" [repo-name] [--tags tag1,tag2] [--status active|complete|archived|experiment]

if [ $# -eq 0 ]; then
  echo "Usage: $0 \"Project Title\" [repo-name] [--tags tag1,tag2] [--status active]"
  exit 1
fi

TITLE="$1"
shift
REPO=""
TAGS_ARG=""
STATUS="active"

# Parse positional and flag arguments
if [ $# -gt 0 ] && [[ ! "$1" == --* ]]; then
  REPO="$1"
  shift
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --tags) TAGS_ARG="$2"; shift 2 ;;
    --status) STATUS="$2"; shift 2 ;;
    *) shift ;;
  esac
done

SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
DATE=$(date +%Y-%m-%d)
FILE="src/content/projects/${SLUG}.md"

if [ -f "$FILE" ]; then
  echo "Error: $FILE already exists"
  exit 1
fi

# Suggest tags from existing projects if none provided
if [ -z "$TAGS_ARG" ]; then
  echo "Popular tags in projects:"
  grep -h '^tags:' src/content/projects/*.md 2>/dev/null \
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
  TAGS_LINE="tags: [$(echo "$TAGS_ARG" | sed 's/,/, /g' | sed 's/[^,]*/"&"/g' | sed 's/" /"/g')]"
fi

# Try to fetch description from GitHub if repo is provided
DESCRIPTION=""
if [ -n "$REPO" ]; then
  REPO_URL="$REPO"
  if [[ ! "$REPO" == http* ]]; then
    REPO_URL="https://api.github.com/repos/adrianwedd/${REPO}"
  fi
  DESCRIPTION=$(curl -sf "$REPO_URL" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null || echo "")
fi

cat > "$FILE" << EOF
---
title: "${TITLE}"
description: "${DESCRIPTION}"
${TAGS_LINE}
${REPO:+repo: "${REPO}"}
status: "${STATUS}"
featured: false
date: ${DATE}
---

EOF

echo "Created: $FILE"
[ -n "$DESCRIPTION" ] && echo "Auto-filled description from GitHub: ${DESCRIPTION}"
