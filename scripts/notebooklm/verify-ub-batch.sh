#!/usr/bin/env bash
# Verify the UB batch actually produced usable assets.
#
# Exit codes from the generation scripts prove nothing here: a stale token
# makes downloads succeed while fetching a thumbnail, so a "successful" run
# can leave a 40KB JPEG named audio.m4a. This checks the artefacts themselves.

set -uo pipefail
cd "$(dirname "$0")"

EXPORT_ROOT="./exports/ub"
FAIL=0

SLUGS=(
  the-glass-cage the-bio-age-trap the-gorgon-protocol the-ghost-in-the-city
  the-boredom-strike weaponized-silence sleep-sovereignty the-analog-insurrection
  the-right-to-be-forgotten memory-wars-and-data-leakage the-data-pyre
  the-hauntology-of-the-infinite-now
)

printf '%-36s %-22s %-22s %s\n' SLUG AUDIO VIDEO INFOGRAPHIC

for slug in "${SLUGS[@]}"; do
  d="$EXPORT_ROOT/$slug/studio"

  # --- audio: must exist, be sizeable, and be real stereo audio ---
  a=$(find "$d/audio" -type f \( -name '*.mp3' -o -name '*.m4a' -o -name '*.mp4' \) 2>/dev/null | head -1)
  if [[ -z "$a" ]]; then
    astat="MISSING"; FAIL=1
  else
    bytes=$(stat -f%z "$a" 2>/dev/null || echo 0)
    if (( bytes < 1000000 )); then
      astat="TOO SMALL (${bytes}B)"; FAIL=1   # thumbnail-instead-of-asset tell
    else
      # Bitrate comes from the FORMAT, not the stream: NLM's AAC-in-MP4 leaves
      # stream=bit_rate empty, so the old stream-only probe reported 0k for
      # every file. That produced a false "96k mono, needs a re-roll" call on
      # audio that was in fact 257k stereo. Probe format, and treat an empty
      # read as "could not measure" rather than as a failing bitrate.
      read -r ch br <<<"$(ffprobe -v error -select_streams a:0 \
        -show_entries stream=channels:format=bit_rate -of csv=p=0 "$a" 2>/dev/null | tr '\n' ' ')"
      if [[ -z "${br:-}" || -z "${ch:-}" ]]; then
        # Fall through rather than `continue` — skipping to the next slug would
        # abandon this one's video and infographic checks and drop its row from
        # the table, hiding two unverified assets behind one unreadable probe.
        astat="UNMEASURABLE"; FAIL=1
        kbps=0
      else
        kbps=$(( br / 1000 ))
        if (( kbps < 200 )) || [[ "${ch:-0}" != "2" ]]; then
          astat="LOW ${kbps}k/${ch:-?}ch"; FAIL=1  # 96k mono = wrong length setting
        else
          astat="ok ${kbps}k/${ch}ch"
        fi
      fi
    fi
  fi

  # --- video ---
  v=$(find "$d/video" -type f -name '*.mp4' 2>/dev/null | head -1)
  if [[ -z "$v" ]]; then
    vstat="MISSING"; FAIL=1
  else
    vbytes=$(stat -f%z "$v" 2>/dev/null || echo 0)
    if (( vbytes < 5000000 )); then
      vstat="TOO SMALL (${vbytes}B)"; FAIL=1
    else
      dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v" 2>/dev/null)
      vstat="ok $(printf '%.0f' "${dur:-0}")s"
    fi
  fi

  # --- infographic ---
  i=$(find "$d/infographic" -type f \( -name '*.png' -o -name '*.webp' \) 2>/dev/null | head -1)
  if [[ -z "$i" ]]; then
    istat="MISSING"; FAIL=1
  else
    ibytes=$(stat -f%z "$i" 2>/dev/null || echo 0)
    (( ibytes < 50000 )) && { istat="TOO SMALL (${ibytes}B)"; FAIL=1; } || istat="ok"
  fi

  printf '%-36s %-22s %-22s %s\n' "$slug" "$astat" "$vstat" "$istat"
done

echo
if (( FAIL )); then
  echo "RESULT: FAILURES ABOVE — do not upload or publish until resolved."
  echo "If several failed at once, suspect the shared token: nlm login --force, then re-run those slugs."
  exit 1
fi
echo "RESULT: all twelve verified."
