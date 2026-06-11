#!/usr/bin/env bash
set -euo pipefail

# generate-all-notebook-assets.sh
# Batch generate NotebookLM audio assets for all projects without them.
#
# Usage:
#   ./scripts/generate-all-notebook-assets.sh [--yes] [--audio-only] [--limit N]
#
# Options:
#   --yes         Skip interactive prompts (for non-interactive/CI use)
#   --audio-only  Generate audio only, skip video (default: audio only)
#   --limit N     Process at most N projects (useful for quota management)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NOTEBOOKLM_DIR="$REPO_ROOT/scripts/notebooklm"
PROJECTS_DIR="$REPO_ROOT/src/content/projects"
PUBLIC_ASSETS="$REPO_ROOT/public/notebook-assets"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Defaults
YES=false
LIMIT=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y) YES=true; shift ;;
        --limit) LIMIT="$2"; shift 2 ;;
        --audio-only) shift ;; # already default
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Counters
TOTAL=0
SUCCESS=0
SKIPPED=0
FAILED=0

echo "=== NotebookLM Asset Batch Generation ==="
echo

# Check dependencies
if ! command -v nlm &>/dev/null; then
    echo -e "${RED}Error: nlm CLI not found. Install: pip install notebooklm-mcp-cli${NC}"
    exit 1
fi

if [ ! -d "$NOTEBOOKLM_DIR" ]; then
    echo -e "${RED}Error: NotebookLM directory not found at $NOTEBOOKLM_DIR${NC}"
    exit 1
fi

# Check authentication
if ! nlm login --check &>/dev/null; then
    echo -e "${YELLOW}Warning: NotebookLM authentication may be expired${NC}"
    echo "Run: nlm login"
    echo
    if [ "$YES" = false ]; then
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo "Continuing (--yes flag set)..."
    fi
fi

# Find projects without audio
echo "Scanning projects..."
PROJECTS_WITHOUT_ASSETS=()

for project_file in "$PROJECTS_DIR"/*.md; do
    project_name=$(basename "$project_file" .md)

    if grep -q "^audioUrl:" "$project_file"; then
        ((SKIPPED++)) || true
        continue
    fi

    PROJECTS_WITHOUT_ASSETS+=("$project_name")
    ((TOTAL++)) || true
done

echo "Found $TOTAL projects without audio assets"
echo "Skipped $SKIPPED projects with existing assets"
echo

if [ $TOTAL -eq 0 ]; then
    echo "All projects already have audio assets!"
    exit 0
fi

# Apply limit
if [ "$LIMIT" -gt 0 ] && [ "$LIMIT" -lt "$TOTAL" ]; then
    echo -e "${YELLOW}Limiting to first $LIMIT projects (of $TOTAL)${NC}"
    PROJECTS_WITHOUT_ASSETS=("${PROJECTS_WITHOUT_ASSETS[@]:0:$LIMIT}")
    TOTAL=$LIMIT
fi

# Show what will be generated
echo "Will generate audio for:"
for project in "${PROJECTS_WITHOUT_ASSETS[@]}"; do
    echo "  - $project"
done
echo

echo -e "${YELLOW}Estimated time: $(($TOTAL * 6)) minutes (avg 6 min per project)${NC}"
echo -e "${YELLOW}NotebookLM daily quota: ~50 audio generations${NC}"
echo

if [ "$YES" = false ]; then
    read -p "Continue with batch generation? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Process each project
for i in "${!PROJECTS_WITHOUT_ASSETS[@]}"; do
    project="${PROJECTS_WITHOUT_ASSETS[$i]}"
    idx=$((i + 1))

    echo
    echo "[$idx/$TOTAL] Processing: $project"
    echo "----------------------------------------"

    project_file="$PROJECTS_DIR/$project.md"
    title=$(grep "^title:" "$project_file" | head -1 | sed 's/^title: *"\{0,1\}\(.*\)"\{0,1\}$/\1/' | sed 's/"$//')

    # Create temp config (audio only)
    config_file=$(mktemp)
    cat > "$config_file" <<EOF
{
  "title": "$title - Overview",
  "sources": [
    "textfile:$project_file"
  ],
  "studio": [
    {"type": "audio"}
  ]
}
EOF

    echo "  Title: $title"
    echo "  Generating audio..."

    # Run automation from notebooklm directory
    export_dir="$NOTEBOOKLM_DIR/exports/$project"
    notebook_dir=""

    cd "$NOTEBOOKLM_DIR"
    ./scripts/automate-notebook.sh \
        --config "$config_file" \
        --export "./exports/$project" 2>&1 | while IFS= read -r line; do echo "    $line"; done || true

    # Find the export subdirectory (name varies)
    if [ -d "$export_dir" ]; then
        notebook_dir=$(find "$export_dir" -maxdepth 1 -type d ! -path "$export_dir" | head -1)
    fi

    # Look for audio in the export
    audio_found=false
    if [ -n "$notebook_dir" ]; then
        audio_file=$(find "$notebook_dir/studio/audio" -name "*.mp3" 2>/dev/null | head -1)
        if [ -n "$audio_file" ]; then
            audio_found=true
            mkdir -p "$PUBLIC_ASSETS/$project"

            # NEVER compress — serve original quality. NLM "mp3" downloads are
            # AAC in an MP4 container; name them audio.m4a so browsers read
            # duration metadata correctly.
            cp "$audio_file" "$PUBLIC_ASSETS/$project/audio.m4a"
            echo -e "  ${GREEN}✓ Original-quality audio copied to public/notebook-assets/$project/audio.m4a${NC}"

            # Update project frontmatter
            cd "$REPO_ROOT"
            if ! grep -q "^audioUrl:" "$project_file"; then
                sed -i '' "/^date:/a\\
audioUrl: \"https://cdn.adrianwedd.com/notebook-assets/$project/audio.m4a\"
" "$project_file"
                echo -e "  ${GREEN}✓ Added audioUrl to project frontmatter${NC}"
            fi

            ((SUCCESS++)) || true
        fi
    fi

    if [ "$audio_found" = false ]; then
        echo -e "  ${RED}✗ No audio file found in export${NC}"
        ((FAILED++)) || true
    fi

    # Cleanup
    rm -f "$config_file"

    # Rate limiting
    if [ $idx -lt $TOTAL ]; then
        echo "  Pausing 10 seconds..."
        sleep 10
    fi
done

echo
echo "=== Batch Generation Complete ==="
echo "Total:     $TOTAL"
echo -e "Success:   ${GREEN}$SUCCESS${NC}"
echo -e "Failed:    ${RED}$FAILED${NC}"
echo "Skipped:   $SKIPPED"
echo

if [ $SUCCESS -gt 0 ]; then
    echo -e "${GREEN}Generated assets are in: public/notebook-assets/${NC}"
    echo -e "${GREEN}Project frontmatter updated with audioUrl${NC}"
    echo
    echo "Next steps:"
    echo "1. Review generated audio files"
    echo "2. npm run build"
    echo "3. Commit and push"
fi
