#!/usr/bin/env bash
set -euo pipefail

# Strip the branded "Google NotebookLM" outro card that NLM appends to the
# end of generated videos (confirmed on --format short exports; the card is
# a fixed-duration splash screen appended after the actual content ends).
# Usage: ./strip-outro.sh <input.mp4> [output.mp4] [--outro-duration SECONDS]

show_help() {
  cat <<EOF
Usage: strip-outro.sh <input.mp4> [output.mp4] [options]

Trim the trailing "Google NotebookLM" branded outro card off an NLM video
export. Re-encodes (libx264 crf 18 / aac 192k) since the cut point falls
mid-GOP; quality loss is not visually perceptible for these promo clips.

Arguments:
  input.mp4          Source video (an NLM export)
  output.mp4          Output path (default: <input>_clean.mp4)

Options:
  --outro-duration N  Seconds of outro to remove (default: 2.02, based on
                       measured NLM short-format exports as of 2026-07-01)
  -h, --help           Show this help message
EOF
  exit 0
}

INPUT=""
OUTPUT=""
OUTRO_DURATION="2.02"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) show_help ;;
    --outro-duration)
      [[ -z "${2:-}" ]] && { echo "Error: --outro-duration requires an argument" >&2; exit 1; }
      OUTRO_DURATION="$2"
      shift 2
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      if [[ -z "$INPUT" ]]; then
        INPUT="$1"
      elif [[ -z "$OUTPUT" ]]; then
        OUTPUT="$1"
      else
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$INPUT" ]]; then
  echo "Error: missing input.mp4" >&2
  echo "Try --help for usage." >&2
  exit 1
fi
if [[ ! -f "$INPUT" ]]; then
  echo "Error: input file not found: $INPUT" >&2
  exit 1
fi
if [[ -z "$OUTPUT" ]]; then
  OUTPUT="${INPUT%.*}_clean.mp4"
fi

TOTAL_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT")
CONTENT_DURATION=$(python3 -c "print(max(0.0, ${TOTAL_DURATION} - ${OUTRO_DURATION}))")

echo "Input:   $INPUT (${TOTAL_DURATION}s)" >&2
echo "Trim to: ${CONTENT_DURATION}s (removing ${OUTRO_DURATION}s outro)" >&2
echo "Output:  $OUTPUT" >&2

ffmpeg -y -i "$INPUT" -t "$CONTENT_DURATION" \
  -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k \
  "$OUTPUT"

echo "Done: $OUTPUT" >&2
