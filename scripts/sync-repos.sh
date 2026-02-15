#!/usr/bin/env bash
# Fetch public GitHub repos and cache metadata to data/repos.json
# Usage: ./scripts/sync-repos.sh
# No auth required — uses public API (60 req/hr).

set -euo pipefail

USERNAME="adrianwedd"
OUT="$(dirname "$0")/../data/repos.json"
TEMP=$(mktemp)

echo "Fetching repos for $USERNAME..."

# Fetch up to 100 repos (paginated)
page=1
echo "[" > "$TEMP"
first=true

while true; do
  response=$(curl -sf "https://api.github.com/users/$USERNAME/repos?per_page=100&page=$page&sort=updated" 2>/dev/null || echo "[]")

  count=$(echo "$response" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

  if [ "$count" = "0" ]; then
    break
  fi

  # Extract relevant fields
  echo "$response" | python3 -c "
import sys, json

repos = json.load(sys.stdin)
first = $( [ "$first" = true ] && echo "True" || echo "False" )

for i, r in enumerate(repos):
    if not first or i > 0:
        print(',')
    print(json.dumps({
        'name': r['name'],
        'description': r.get('description') or '',
        'language': r.get('language') or '',
        'topics': r.get('topics', []),
        'url': r['html_url'],
        'homepage': r.get('homepage') or '',
        'stars': r.get('stargazers_count', 0),
        'forks': r.get('forks_count', 0),
        'updated_at': r.get('pushed_at') or r.get('updated_at', ''),
        'fork': r.get('fork', False),
        'archived': r.get('archived', False),
    }, indent=2))
" >> "$TEMP"

  first=false
  page=$((page + 1))

  if [ "$count" -lt 100 ]; then
    break
  fi
done

echo "]" >> "$TEMP"

# Validate JSON and move to output
python3 -c "import json; json.load(open('$TEMP'))" 2>/dev/null
mv "$TEMP" "$OUT"

count=$(python3 -c "import json; print(len(json.load(open('$OUT'))))")
echo "Cached $count repos to $OUT"
