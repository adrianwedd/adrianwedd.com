#!/usr/bin/env bash
set -euo pipefail

# fb-post.sh — CLI for Facebook posting via social worker
# Reads SOCIAL_WORKER_URL and SOCIAL_CLI_SECRET from .env or environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present (uses export to handle values with special chars)
if [ -f "$REPO_DIR/.env" ]; then
  while IFS='=' read -r key value; do
    # Skip comments and blank lines
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    # Strip inline comments only when the # starts a new field (preceded by
    # whitespace) — a bare '#' inside a value (e.g. a token) must survive.
    value="$(printf '%s' "$value" | sed -E 's/[[:space:]]+#.*$//')"
    # Strip surrounding whitespace and quotes
    key="${key// /}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    export "$key=$value"
  done < "$REPO_DIR/.env"
fi

usage() {
  cat <<'EOF'
Usage:
  fb-post.sh "message"                          # Immediate text post
  fb-post.sh "message" --link "URL"             # Immediate link post
  fb-post.sh "message" --image "URL"            # Immediate photo post
  fb-post.sh "message" --schedule ISO_DATETIME  # Schedule a post
  fb-post.sh "message" --backdate ISO_DATETIME  # Post with past date
  fb-post.sh --sync                             # Sync queue from JSON
  fb-post.sh --status                           # Queue status
  fb-post.sh --health                           # Token health

Note: Always quote URLs containing ? or & to prevent shell glob expansion.
EOF
  exit 1
}

# Disable glob expansion — URLs with ? and & should not be treated as globs
set -f

[ $# -eq 0 ] && usage

URL="${SOCIAL_WORKER_URL:?Set SOCIAL_WORKER_URL in .env}"
SECRET="${SOCIAL_CLI_SECRET:?Set SOCIAL_CLI_SECRET in .env}"

case "$1" in
  --sync)
    HASH=$(sha256sum "$REPO_DIR/social/facebook-posts.json" | cut -d' ' -f1)
    POSTS=$(jq '.posts' "$REPO_DIR/social/facebook-posts.json")
    curl -s -X POST "$URL/api/queue/sync" \
      -H "Authorization: Bearer $SECRET" \
      -H "Content-Type: application/json" \
      --data "$(jq -n --arg hash "$HASH" --argjson posts "$POSTS" '{hash: $hash, posts: $posts}')" | jq .
    ;;
  --status|--health)
    curl -s "$URL/api/health" \
      -H "Authorization: Bearer $SECRET" | jq .
    ;;
  *)
    MESSAGE="$1"
    shift
    TYPE="text"
    LINK=""
    IMAGE=""
    SCHEDULE=""
    BACKDATE=""

    while [ $# -gt 0 ]; do
      case "$1" in
        --link) TYPE="link"; LINK="$2"; shift 2 ;;
        --image) TYPE="photo"; IMAGE="$2"; shift 2 ;;
        --schedule) SCHEDULE="$2"; shift 2 ;;
        --backdate) BACKDATE="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; usage ;;
      esac
    done

    if [ -n "$SCHEDULE" ]; then
      curl -s -X POST "$URL/api/queue" \
        -H "Authorization: Bearer $SECRET" \
        -H "Content-Type: application/json" \
        --data "$(jq -n \
          --arg platform "facebook" \
          --arg type "$TYPE" \
          --arg message "$MESSAGE" \
          --arg scheduledAt "$SCHEDULE" \
          --arg link "$LINK" \
          --arg image "$IMAGE" \
          '{platform: $platform, type: $type, message: $message, scheduledAt: $scheduledAt, link: (if $link == "" then null else $link end), imageUrl: (if $image == "" then null else $image end)}')" | jq .
    else
      KEY="cli-$(date +%Y%m%d%H%M%S)-$$"
      curl -s -X POST "$URL/api/publish" \
        -H "Authorization: Bearer $SECRET" \
        -H "Content-Type: application/json" \
        --data "$(jq -n \
          --arg platform "facebook" \
          --arg type "$TYPE" \
          --arg message "$MESSAGE" \
          --arg link "$LINK" \
          --arg image "$IMAGE" \
          --arg key "$KEY" \
          --arg backdate "$BACKDATE" \
          '{platform: $platform, type: $type, message: $message, link: (if $link == "" then null else $link end), imageUrl: (if $image == "" then null else $image end), backdatedTime: (if $backdate == "" then null else $backdate end), idempotencyKey: $key}')" | jq .
    fi
    ;;
esac
