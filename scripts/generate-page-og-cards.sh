#!/usr/bin/env bash
set -uo pipefail

# generate-page-og-cards.sh
#
# Generate a branded landscape OG card for each static/index page — the pages
# that are not content entries and so have no infographic hero to borrow. Before
# this, all of them shared a single generic /og-default.png.
#
# One fresh notebook per page, seeded only with that page's own source bundle
# (see build-page-og-sources.mjs). Deliberately NOT reusing existing notebooks:
# a notebook assembled for some other purpose carries sources the page does not
# cover, and that is exactly how a card ends up advertising the wrong subject.
#
# Resumable by design — each page is independent and skipped if its PNG already
# exists, so a run killed by rate limits can simply be re-run.
#
# Usage:
#   ./scripts/generate-page-og-cards.sh [--sources DIR] [--out DIR] [--only SLUG]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCES_DIR="$REPO_ROOT/.og-sources"
OUT_DIR="$REPO_ROOT/.og-cards"
ONLY=""

while [ $# -gt 0 ]; do
    case "$1" in
        --sources) SOURCES_DIR="$2"; shift 2 ;;
        --out)     OUT_DIR="$2"; shift 2 ;;
        --only)    ONLY="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
done

# The canonical brand palette (CLAUDE.md), kept byte-identical to the other
# infographic scripts so every generated asset lands in the same visual system.
# The "professional data visualisation" clause from that prompt is deliberately
# dropped here — a share card must not visualise data. See BRIEF below.
BRAND="Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34). Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones, no bright or neon colours. Strong typographic hierarchy. WCAG AA contrast ratios. Minimal, sophisticated, Australian dark-mode design. Decoration limited to subtle botanical line-art, kept to the corners and well away from the text."

# --detail concise is load-bearing, not a size preference. The default asks for
# more text and more data points than a single page supports, and that surplus
# is where invention starts.
DETAIL="concise"

# The card's wording is dictated, not summarised.
#
# A source-grounded card still fabricates: the first test run produced four
# correct figures (post counts, dependency counts — all present in the bundle)
# and one invented one, "560 static pages", against an actual 777. Nothing on a
# social card gets fact-checked, so the fix is not better grounding but removing
# the model's licence to assert facts at all. The page title and description are
# already the true, human-written summary of the page; the card's job is to set
# them beautifully, not to reinterpret them.
#
# Constraints are stated first and as explicit negations. Buried or positively
# phrased constraints in these prompts get ignored — the same lesson as the
# video style prompts.
build_brief() {
    local title="$1" desc="$2"
    cat <<EOF
This is a SOCIAL SHARE CARD, not an infographic. It is viewed at thumbnail size in a feed, so it must carry one headline and one short supporting line, set large and legible when the image is only 400 pixels wide.

ABSOLUTE CONSTRAINTS — these override every other instruction and any tendency toward density:
- Do NOT include any statistics, numbers, counts, percentages, dates or versions of your own. None, not even accurate ones. The only exception is a number already present in the two supplied strings below, which is reproduced as part of that string.
- Do NOT include charts, graphs, plots, meters, timelines or any data visualisation.
- Do NOT use a multi-row, multi-column, grid, bento or card-stack layout.
- Do NOT add icon rows, bullet lists, sections, headers or footers.
- Do NOT summarise, expand on, or draw additional claims from the source material.
- Do NOT invent a title of your own.
- Do NOT draw a border, frame, outline, rule, panel, box or inset rectangle around the content or around the card itself. The background must run to all four edges uninterrupted.
- Do NOT change the case of the supplied text. Reproduce it exactly as written — no upper-casing, no small-caps, no title-casing.
- Do NOT bold, italicise, colour or otherwise emphasise individual words or fragments within the supporting line. It is one uniform run of text.

The ONLY text permitted anywhere in the image is exactly these two strings, reproduced verbatim:
HEADLINE: "$title"
SUPPORTING LINE: "$desc"

Set the headline dominant and the supporting line small beneath it. Leave generous empty space — most of the frame should be background. Keep all text within the central 84% of the frame, with nothing meaningful within 8% of any edge, because the card is cropped slightly on all sides when it is displayed.

The source material is provided only so the imagery suits the subject. Draw no text from it.

$BRAND
EOF
}

if [ ! -f "$SOURCES_DIR/manifest.json" ]; then
    echo "ERROR: no manifest at $SOURCES_DIR/manifest.json" >&2
    echo "Run: node scripts/build-page-og-sources.mjs $SOURCES_DIR" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

slugs=$(python3 -c "
import json,sys
m=json.load(open('$SOURCES_DIR/manifest.json'))
for e in m: print(e['slug'])
")

# Look up a manifest field for a slug.
manifest_field() {
    python3 -c "
import json,sys
m=json.load(open('$SOURCES_DIR/manifest.json'))
for e in m:
    if e['slug']=='$1':
        print(e.get('$2','') or '')
        break
"
}

total=0; done_count=0; skipped=0; failed=()

for slug in $slugs; do
    [ -n "$ONLY" ] && [ "$slug" != "$ONLY" ] && continue
    total=$((total + 1))

    png="$OUT_DIR/$slug.png"
    if [ -f "$png" ]; then
        echo "== $slug: already generated, skipping"
        skipped=$((skipped + 1))
        continue
    fi

    src="$SOURCES_DIR/$slug.md"
    if [ ! -f "$src" ]; then
        echo "== $slug: MISSING source bundle $src" >&2
        failed+=("$slug:no-source")
        continue
    fi

    echo "== $slug"

    # 1. Fresh notebook, named so it is identifiable in the NotebookLM UI.
    # `nlm create notebook` has no --json; the id has to come out of the text.
    nb_out=$(nlm create notebook "OG Card — $slug" 2>&1)
    nb_id=$(echo "$nb_out" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
    if [ -z "$nb_id" ]; then
        echo "   ERROR: could not create notebook" >&2
        echo "   $nb_out" >&2
        failed+=("$slug:no-notebook")
        continue
    fi
    echo "   notebook: $nb_id"

    # 2. Seed it with the page bundle, and wait — generating against a notebook
    #    whose source is still processing yields an empty-source infographic.
    if ! nlm source add "$nb_id" --file "$src" --title "$slug page" --wait >/dev/null 2>&1; then
        echo "   ERROR: source add failed" >&2
        failed+=("$slug:no-source-added")
        continue
    fi

    # Confirm the source actually landed. An empty notebook still generates —
    # it just invents the entire card, which is the failure this guards.
    src_count=$(nlm list sources "$nb_id" --json 2>/dev/null | python3 -c "
import json,sys
try: print(len(json.load(sys.stdin)))
except Exception: print(0)
" 2>/dev/null || echo 0)
    if [ "$src_count" -lt 1 ]; then
        echo "   ERROR: notebook has no sources after add" >&2
        failed+=("$slug:empty-notebook")
        continue
    fi

    # 3. Generate, with the wording dictated by the brief.
    page_title=$(manifest_field "$slug" title)
    page_desc=$(manifest_field "$slug" description)
    if [ -z "$page_title" ]; then
        echo "   ERROR: no title in manifest — the brief needs one" >&2
        failed+=("$slug:no-title")
        continue
    fi
    brief=$(build_brief "$page_title" "$page_desc")

    create_out=$(nlm infographic create "$nb_id" \
        --orientation landscape \
        --detail "$DETAIL" \
        --focus "$brief" \
        -y 2>&1)
    art_id=$(echo "$create_out" | grep "Artifact ID:" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
    [ -z "$art_id" ] && art_id=$(echo "$create_out" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | tail -1)
    if [ -z "$art_id" ]; then
        echo "   ERROR: no artifact id" >&2
        echo "   $create_out" >&2
        failed+=("$slug:no-artifact")
        continue
    fi
    echo "   artifact: $art_id"

    # 4. Poll. studio status returns JSON — grepping its text for "generating"
    #    never matches, which silently drops through to downloading a URL that
    #    does not exist yet. Parse it.
    status="unknown"
    for attempt in $(seq 1 60); do
        sleep 5
        status=$(nlm studio status "$nb_id" --json 2>/dev/null | python3 -c "
import json,sys
try:
    arts=json.load(sys.stdin)
    t=[a for a in arts if a.get('id')=='$art_id']
    print(t[0].get('status','unknown') if t else 'not_found')
except Exception: print('error')
" 2>/dev/null || echo error)
        [ "$status" = "completed" ] && break
        [ "$status" = "failed" ] && break
        if [ $((attempt % 12)) -eq 0 ]; then echo "   still generating (${attempt}x5s)"; fi
    done

    if [ "$status" != "completed" ]; then
        echo "   ERROR: ended in status '$status'" >&2
        failed+=("$slug:$status")
        continue
    fi

    # 5. Download. --output wants a FILE path, not a directory.
    if ! nlm download infographic "$nb_id" --id "$art_id" -o "$png" >/dev/null 2>&1; then
        echo "   ERROR: download failed" >&2
        failed+=("$slug:download")
        continue
    fi
    if [ ! -s "$png" ]; then
        echo "   ERROR: downloaded file is empty" >&2
        rm -f "$png"
        failed+=("$slug:empty-download")
        continue
    fi

    dims=$(sips -g pixelWidth -g pixelHeight "$png" 2>/dev/null | awk '/pixel/{printf "%s ", $2}')
    kb=$(( $(stat -f%z "$png" 2>/dev/null || stat -c%s "$png") / 1024 ))
    echo "   saved: ${dims}(${kb}KB)"
    done_count=$((done_count + 1))
done

echo
echo "generated $done_count, skipped $skipped, of $total"
if [ ${#failed[@]} -gt 0 ]; then
    echo "FAILED (${#failed[@]}): ${failed[*]}" >&2
    echo "Re-run to retry — completed pages are skipped." >&2
    exit 1
fi
