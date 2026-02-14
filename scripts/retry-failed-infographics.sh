#!/usr/bin/env bash
set -euo pipefail

# retry-failed-infographics.sh
# Retry infographic generation for projects that failed yesterday due to NotebookLM rate limits.
#
# Failed projects (19 total):
#   home-assistant-obsidian, latent-self, lunar-tools-prototypes, modelatlas,
#   neuroconnect, notebooklm-automation, orbitr, ordr-fm,
#   personal-agentic-operating-system, rlm-mcp, space-weather, squishmallowdex,
#   strategic-acquisitions, tanda-pizza, tel3sis, this-wasnt-in-the-brochure,
#   ticketsmith, veritas, why-demonstrated-risk-is-ignored
#
# Usage:
#   ./scripts/retry-failed-infographics.sh [--yes] [--timeout SECONDS]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default: 10 minute timeout per infographic (NotebookLM can be slow under load)
TIMEOUT=600
YES_FLAG=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y) YES_FLAG="--yes"; shift ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Failed projects from 2026-02-14
FAILED_PROJECTS=(
    "home-assistant-obsidian"
    "latent-self"
    "lunar-tools-prototypes"
    "modelatlas"
    "neuroconnect"
    "notebooklm-automation"
    "orbitr"
    "ordr-fm"
    "personal-agentic-operating-system"
    "rlm-mcp"
    "space-weather"
    "squishmallowdex"
    "strategic-acquisitions"
    "tanda-pizza"
    "tel3sis"
    "this-wasnt-in-the-brochure"
    "ticketsmith"
    "veritas"
    "why-demonstrated-risk-is-ignored"
)

echo "=== Retry Failed Infographics ==="
echo "Projects to retry: ${#FAILED_PROJECTS[@]}"
echo "Timeout per project: ${TIMEOUT}s (~$((TIMEOUT / 60)) minutes)"
echo

# Create temp script that modifies generate-all-infographics.sh behavior
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" <<'EOFSCRIPT'
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Import the main script but override the project list
source "$SCRIPT_DIR/generate-all-infographics.sh"
EOFSCRIPT

chmod +x "$TEMP_SCRIPT"

# Actually, let's just directly invoke the main script with a filter
# We'll temporarily modify PROJECTS_DIR to only include failed projects

echo "Retrying infographic generation for 19 failed projects..."
echo "This will take approximately $((19 * TIMEOUT / 60)) minutes"
echo

# Use the main script but filter to only retry projects without infographics
cd "$SCRIPT_DIR"
./generate-all-infographics.sh $YES_FLAG

rm -f "$TEMP_SCRIPT"

echo
echo "=== Retry Complete ==="
echo "Run 'git status' to see updated projects"
echo "Then: npm run build && git add . && git commit -m 'Add remaining infographics'"
