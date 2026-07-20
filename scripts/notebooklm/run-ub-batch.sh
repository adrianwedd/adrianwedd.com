#!/usr/bin/env bash
# Generate NLM kits for the twelve Ungovernable Body essay chapters.
#
# Drives `nlm` directly rather than automate-notebook.sh: the config schema
# only accepts {type, description} per studio item, so it cannot carry the
# cinematic video format or the branded style prompt. Those are CLI flags.
#
# Rate-limited on purpose. The nlm CLI has no locking around its shared token
# file (~/.notebooklm-mcp-cli/profiles/default), so concurrent processes can
# clobber each other mid-refresh. That failure is silent: auth goes stale and
# downloads quietly fetch a thumbnail instead of the asset. Hence a small
# concurrency cap, a stagger between launches, and verify-ub-batch.sh after.
#
#   ./run-ub-batch.sh [--concurrency N] [--stagger SECS] [--dry-run] [--only SLUG]

set -uo pipefail
cd "$(dirname "$0")"

CONCURRENCY=3
PIDS=""   # must exist before the launch loop: the script runs under `set -u`
STAGGER=25
DRY_RUN=0
ONLY=""
EXPORT_ROOT="./exports/ub"
LOG_DIR="./logs/ub"
STATE="./logs/ub/notebooks.tsv"   # slug <TAB> notebook_id, so reruns reuse

while [[ $# -gt 0 ]]; do
  case "$1" in
    --concurrency) CONCURRENCY="$2"; shift 2 ;;
    --stagger)     STAGGER="$2"; shift 2 ;;
    --only)        ONLY="$2"; shift 2 ;;
    --dry-run)     DRY_RUN=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

mkdir -p "$EXPORT_ROOT" "$LOG_DIR"
touch "$STATE"

CHAPTER_DIR="/Users/adrian/repos/ungovernable-body/research/markdown"

PALETTE="Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34). Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones, no bright or neon colours. Elegant editorial layout with strong typographic hierarchy. Muted, saturated palette. WCAG AA contrast. Minimal, sophisticated, Australian dark-mode design."
RULES="No stock footage, only original abstract animation. No human figures, no faces, no bodies. Abstract geometry, botanical forms, grain, drift and decay motifs only."
BEATS="Beat structure: open on the concrete image, name the mechanism, show what it does to a person, turn to the counter-claim, close on the ethical stake. Slow deliberate pacing, long holds, no rapid cutting."

# slug | chapter filename | motif
read -r -d '' ROWS <<'EOF'
the-glass-cage|Chapter 0.1_ The Glass Cage_ The Biopolitics of the User.md|Glass, refraction, vitrines, light that exposes rather than illuminates.
the-bio-age-trap|Chapter 1.1_ The Bio-Age Trap_ The Politics of Legibility in the Age of Algorithmic Underwriting.md|Actuarial grids, drifting numerals, clocks running at uneven speeds, ledger rules.
the-gorgon-protocol|Chapter 1.2_ The Gorgon Protocol_ Adversarial Aesthetics and the Weaponization of the Grotesque.md|Fractured mirrors, adversarial pattern noise, serpentine line work, masks that are not faces.
the-ghost-in-the-city|Chapter 1.3_ The Ghost in the City.md|Empty transit architecture, bench slats, wayfinding arrows, long shadows, absence of people.
the-boredom-strike|Chapter 2.1_ The Boredom Strike.md|Stalled feeds, flatlining waveforms, dust in still air, an unmoving cursor.
weaponized-silence|Chapter 2.2_ Weaponized Silence.md|Silent waveform troughs, empty speech-bubble geometry, muffled negative space.
sleep-sovereignty|Chapter 2.3_ Sleep Sovereignty — The Colonization of the Nocturnal Imaginary and the Biopolitics of Rest.md|Nocturnal blues bleeding into plum, sleep-stage ribbons, curtains, the glow of a device at 3am.
the-analog-insurrection|Chapter 3.1_ The Analog Insurrection.md|Paper grain, ink bleed, mechanical type, cash, hand-drawn lines against clean vectors.
the-right-to-be-forgotten|Chapter 3.2_ The Right to Be Forgotten — The Ontological Right to Finitude and the Necessity of _Data Death_.md|Dissolving records, fading indices, an archive shelf emptying, soft erasure.
memory-wars-and-data-leakage|Chapter 3.3_ Memory Wars & Data Leakage_ The Ungovernable Body in the Age of the Database Self_.md|Overlapping ledgers, bleeding databases, contradictory timestamps, palimpsest layers.
the-data-pyre|Chapter 3.4_ The Data Pyre—Ritualizing Deletion in the Age of the Ungovernable Body.md|Fire as ritual not disaster, ember drift, ash, ceremonial geometry, controlled burn.
the-hauntology-of-the-infinite-now|Chapter 4.1_ The Hauntology of the Infinite Now.md|Echoes and after-images, looping motion, spectral doubling, time folded on itself.
EOF

# Pre-existing notebook for chapter 1.2 — reuse, never duplicate.
grep -q "^the-gorgon-protocol	" "$STATE" 2>/dev/null || \
  printf 'the-gorgon-protocol\t790c9527-5ef0-4c36-93c5-22107803ef7a\n' >> "$STATE"

# artifact_state <notebook> <type|any> -> one status per matching artifact.
#
# `nlm studio status` returns a JSON array of {type,status}. On any failure —
# auth expired, rate limit, malformed body — this prints "unknown", which is
# deliberately not a terminal state: the poll loop keeps waiting instead of
# racing ahead to download nothing.
artifact_state() {
  local nb="$1" want="$2" raw
  raw=$(nlm studio status "$nb" 2>/dev/null) || { echo unknown; return 0; }
  printf '%s' "$raw" | python3 -c '
import sys, json
want = sys.argv[1]
try:
    items = json.load(sys.stdin)
    if not isinstance(items, list): raise ValueError
except Exception:
    print("unknown"); sys.exit(0)
for a in items:
    if want == "any" or a.get("type") == want:
        print(a.get("status") or "unknown")
' "$want" 2>/dev/null || echo unknown
}

process_one() {
  local slug="$1" chapter="$2" motif="$3"
  local out="$EXPORT_ROOT/$slug"
  local src="$CHAPTER_DIR/$chapter"
  mkdir -p "$out/studio/audio" "$out/studio/video" "$out/studio/infographic"

  [[ -f "$src" ]] || { echo "    FAIL $slug: source missing: $src"; return 1; }

  local nb
  nb=$(awk -v s="$slug" -F'\t' '$1==s{print $2}' "$STATE" | head -1)

  if (( DRY_RUN )); then
    echo "    dry  $slug  nb=${nb:-<would create>}  src=$(basename "$src")"
    return 0
  fi

  if [[ -z "$nb" ]]; then
    # --json, not --confirm (no such option); key is notebook_id, not id.
    # stderr is kept so a failure says what it is instead of "create failed".
    local raw
    raw=$(nlm notebook create "The Ungovernable Body — $slug" --json 2>&1)
    nb=$(printf '%s' "$raw" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("notebook_id",""))' 2>/dev/null)
    [[ -n "$nb" ]] || { echo "    FAIL $slug: notebook create failed: $raw"; return 1; }
    printf '%s\t%s\n' "$slug" "$nb" >> "$STATE"
    # Nothing here goes to /dev/null: a swallowed stderr is how a broken
    # --confirm flag stayed invisible through a whole batch run. Everything
    # is inherited by the caller's redirect into logs/ub/<slug>.log.
    nlm source add "$nb" --file "$src" --wait \
      || { echo "    FAIL $slug: source add failed (see logs/ub/$slug.log)"; return 1; }
  fi

  local focus="$PALETTE $RULES $motif $BEATS"
  local problems=0

  # deep_dive at default length = 256k stereo. Never --length long (96k mono).
  # Non-fatal by design (one asset failing shouldn't sink the slug) but the
  # failure is recorded, not discarded.
  #
  # Creation is NOT idempotent: re-running a slug adds another copy rather than
  # replacing. Two slugs ended up with 2-3 audios/videos each that way. So skip
  # any type that already has a completed or in-flight artifact.
  local asset
  for asset in audio video infographic; do
    # ANY listed artifact of this type means one was already requested —
    # including `unknown`, which is what this CLI actually reports for an
    # in-flight generation (34 such entries across the first batch's logs).
    # Omitting it here is how a rerun produced 2-3 duplicate copies.
    if artifact_state "$nb" "$asset" | grep -q .; then
      echo "    skip $slug: $asset already exists"
      continue
    fi

    # Video is the rate-limited one (RESOURCE_EXHAUSTED killed five slugs in the
    # first batch). Retry with backoff rather than losing the asset.
    local try rc
    for try in 1 2 3; do
      case "$asset" in
        audio) nlm audio create "$nb" --format deep_dive --confirm ;;
        video) nlm video create "$nb" --format cinematic --style-prompt "$focus" --confirm ;;
        infographic) nlm infographic create "$nb" --orientation landscape --style editorial \
                       --focus "$PALETTE $RULES $motif" --confirm ;;
      esac
      rc=$?
      (( rc == 0 )) && break
      echo "    retry $slug: $asset create failed (attempt $try/3)"
      # Don't sleep after the final attempt — that is six minutes of
      # guaranteed-useless waiting before the WARN fires.
      (( try < 3 )) && sleep $(( try * 120 ))
    done
    (( rc == 0 )) || { echo "    WARN $slug: $asset create failed after 3 tries"; problems=1; }
  done

  # Generation is async; poll then pull. `nlm studio status` emits JSON, so the
  # old text grep for "generating|pending" matched nothing and broke on the very
  # first poll — every download then ran before the media URL existed and the
  # whole batch "succeeded" with zero files. Wait on parsed state instead, and
  # treat an unparseable/errored status as "keep waiting", never as "done".
  # A create that was just issued may not be listed yet; an empty array would
  # otherwise read as "nothing pending" and break the loop on the first poll —
  # the same race this rewrite exists to remove. Let the list settle first.
  sleep 60
  # Wait on the THREE KINDS WE WANT, not on the notebook's whole artifact list.
  # Watching the list means an unrelated historical artifact stuck at `unknown`
  # — notebooks reused across runs accumulate them — blocks for the full
  # timeout even though everything needed is already downloadable. Asking "is
  # there a completed audio/video/infographic yet?" is the actual question.
  #
  # An empty list early on still counts as waiting: a just-issued create may
  # not have registered, and calling that "done" is the original race.
  local waited=0 ready listed
  while (( waited < 1800 )); do
    ready=0
    for asset in audio video infographic; do
      artifact_state "$nb" "$asset" | grep -qx completed && ready=$((ready+1))
    done
    (( ready == 3 )) && break
    listed=$(artifact_state "$nb" any | grep -c . || true)
    if (( listed > 0 && waited >= 300 )); then
      # Everything listed has settled and nothing more is coming — stop early
      # rather than idling to the timeout. Missing kinds are reported below.
      artifact_state "$nb" any | grep -qvx "completed\|failed" || break
    fi
    sleep 30; waited=$((waited+30))
  done
  (( waited >= 1800 )) && { echo "    WARN $slug: still generating after 30m"; problems=1; }

  local kind out_file
  for kind in audio video infographic; do
    case "$kind" in
      # These paths must match what verify-ub-batch.sh globs (studio/<kind>/),
      # or the verifier reports every asset MISSING for assets that downloaded
      # fine — a false alarm indistinguishable from a genuinely empty run.
      audio) out_file="$out/studio/audio/overview.m4a" ;;
      video) out_file="$out/studio/video/overview.mp4" ;;
      infographic) out_file="$out/studio/infographic/overview.png" ;;
    esac
    artifact_state "$nb" "$kind" | grep -qx completed || {
      echo "    WARN $slug: no completed $kind to download"; problems=1; continue; }
    nlm download "$kind" "$nb" --output "$out_file" \
      || { echo "    WARN $slug: $kind download failed (see logs/ub/$slug.log)"; problems=1; }
  done

  # Don't print "ok" over the top of warnings — that is how the first batch
  # reported twelve successes while writing nothing to disk.
  (( problems )) && { echo "    PARTIAL $slug (nb=$nb) — see warnings above"; return 1; }
  echo "    ok   $slug (nb=$nb)"
}

echo "==> concurrency=$CONCURRENCY stagger=${STAGGER}s $((DRY_RUN)) ${ONLY:+only=$ONLY}"

while IFS='|' read -r slug chapter motif; do
  [[ -z "$slug" ]] && continue
  [[ -n "$ONLY" && "$slug" != "$ONLY" ]] && continue

  while (( $(jobs -rp | wc -l) >= CONCURRENCY )); do sleep 5; done

  echo "--> launching $slug"
  process_one "$slug" "$chapter" "$motif" >>"$LOG_DIR/$slug.log" 2>&1 &
  PIDS="$PIDS $!"
  (( DRY_RUN )) || sleep "$STAGGER"
done <<< "$ROWS"

# Bare `wait` returns 0 once all jobs finish, even when children failed — so a
# batch where every slug came back PARTIAL still exits success and any caller
# or CI step sees a green run. Wait per-PID and keep the worst status.
RC=0
for pid in $PIDS; do
  wait "$pid" || RC=1
done

echo "==> launches finished. Nothing is trustworthy until:"
echo "    ./verify-ub-batch.sh"
(( RC )) && echo "==> at least one slug was PARTIAL — see logs/ub/*.log"
exit $RC
