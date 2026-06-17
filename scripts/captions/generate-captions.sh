#!/usr/bin/env bash
# Generate WebVTT captions for NLM videos (issue #472 B8 / WCAG 1.2.2).
#
# For each notebook path:  pull video.mp4 from R2 → extract audio → transcribe
# (afterwords, Metal-native parakeet) → group into cues → write a same-origin
# captions.vtt under public/notebook-assets/<path>/.
#
# Idempotent + resumable: skips paths that already have captions.vtt (unless --force),
# so the long-tail batch can be re-run after interruptions.
#
# Usage:
#   scripts/captions/generate-captions.sh --pilot              # the 4 verification picks
#   scripts/captions/generate-captions.sh --all                # every video missing captions
#   scripts/captions/generate-captions.sh governance-lag-index lyria-chronicles/machine
#   scripts/captions/generate-captions.sh --all --backend faster-whisper --force
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AW_PY="${REPO_DIR}/../afterwords/.venv/bin/python"
TRANSCRIBE="${REPO_DIR}/../afterwords/scripts/transcribe.py"
VTT="${REPO_DIR}/scripts/captions/words_to_vtt.py"
CDN="https://cdn.adrianwedd.com/notebook-assets"
BACKEND="parakeet"
FORCE=0
PILOT=(governance-lag-index afterwords lejepa-self-supervised-learning-gets-a-theoretical-foundation eight-minutes-the-fall)

die() { echo "error: $*" >&2; exit 1; }
[ -x "$AW_PY" ] || die "afterwords venv python not found at $AW_PY"
[ -f "$TRANSCRIBE" ] || die "transcribe.py not found at $TRANSCRIBE"
command -v ffmpeg >/dev/null || die "ffmpeg not installed"

# Collect every notebook path that has a videoUrl (strip CDN prefix + /video.mp4).
discover_all() {
  grep -rhoE 'videoUrl: *.https://cdn\.adrianwedd\.com/notebook-assets/[^"'"'"']+/video\.mp4' \
    "${REPO_DIR}/src/content/" \
    | sed -E 's#.*/notebook-assets/##; s#/video\.mp4##' \
    | sort -u
}

PATHS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --pilot)   PATHS+=("${PILOT[@]}") ;;
    --all)     while IFS= read -r p; do PATHS+=("$p"); done < <(discover_all) ;;
    --force)   FORCE=1 ;;
    --backend) shift; [ $# -gt 0 ] || die "--backend requires an argument"; BACKEND="$1" ;;
    -*)        die "unknown flag: $1" ;;
    *)         PATHS+=("$1") ;;
  esac
  shift
done
[ ${#PATHS[@]} -gt 0 ] || die "no paths — pass notebook paths, --pilot, or --all"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
total=${#PATHS[@]}; done_n=0; skip_n=0; fail_n=0; i=0

echo "captions: ${total} path(s), backend=${BACKEND}, force=${FORCE}"
for path in "${PATHS[@]}"; do
  i=$((i + 1))
  # `path` is interpolated straight into a filesystem write target, so reject
  # anything that isn't a plain notebook slug (no leading slash, no `..`, no
  # dots/spaces/shell metacharacters) before it can escape notebook-assets/.
  if ! [[ "$path" =~ ^[A-Za-z0-9][A-Za-z0-9/_-]*$ ]] || [[ "$path" == *..* ]]; then
    printf '[%d/%d] %s ... FAIL (unsafe path)\n' "$i" "$total" "$path" >&2
    fail_n=$((fail_n + 1)); continue
  fi
  out_dir="${REPO_DIR}/public/notebook-assets/${path}"
  out_vtt="${out_dir}/captions.vtt"
  printf '[%d/%d] %s ... ' "$i" "$total" "$path"

  if [ "$FORCE" -eq 0 ] && [ -f "$out_vtt" ]; then
    echo "skip (exists)"; skip_n=$((skip_n + 1)); continue
  fi

  wav="${TMP}/audio.wav"
  if ! ffmpeg -nostdin -loglevel error -y -i "${CDN}/${path}/video.mp4" \
        -vn -ac 1 -ar 16000 "$wav" 2>"${TMP}/ff.err"; then
    echo "FAIL (ffmpeg)"; sed 's/^/    /' "${TMP}/ff.err" >&2; fail_n=$((fail_n + 1)); continue
  fi

  words="${TMP}/words.json"
  if ! "$AW_PY" "$TRANSCRIBE" "$wav" --backend "$BACKEND" --out "$words" 2>"${TMP}/tr.err"; then
    echo "FAIL (transcribe)"; sed 's/^/    /' "${TMP}/tr.err" >&2; fail_n=$((fail_n + 1)); continue
  fi

  mkdir -p "$out_dir"
  if ! "$AW_PY" "$VTT" "$words" -o "$out_vtt" 2>"${TMP}/vtt.err"; then
    echo "FAIL (vtt)"; sed 's/^/    /' "${TMP}/vtt.err" >&2; fail_n=$((fail_n + 1)); continue
  fi

  cues=$(grep -c -- '-->' "$out_vtt")
  echo "ok (${cues} cues)"; done_n=$((done_n + 1))
done

echo "captions done: ${done_n} written, ${skip_n} skipped, ${fail_n} failed"
[ "$fail_n" -eq 0 ]
