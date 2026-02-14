#!/usr/bin/env bash
set -euo pipefail

# generate-all-notebook-assets.sh
# Batch generate NotebookLM audio/video assets for all projects without them

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NOTEBOOKLM_DIR="$REPO_ROOT/scripts/notebooklm"
PROJECTS_DIR="$REPO_ROOT/src/content/projects"
AUDIO_DIR="$REPO_ROOT/src/content/audio"
PUBLIC_ASSETS="$REPO_ROOT/public/notebook-assets"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
SUCCESS=0
SKIPPED=0
FAILED=0

echo "=== NotebookLM Asset Batch Generation ==="
echo

# Check if notebooklm directory exists
if [ ! -d "$NOTEBOOKLM_DIR" ]; then
    echo -e "${RED}Error: NotebookLM directory not found at $NOTEBOOKLM_DIR${NC}"
    exit 1
fi

# Check if authenticated
if ! "$NOTEBOOKLM_DIR/scripts/doctor.sh" > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: NotebookLM authentication may be required${NC}"
    echo "Run: cd $NOTEBOOKLM_DIR && nlm login"
    echo
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Find projects without audio/video
echo "Scanning projects..."
PROJECTS_WITHOUT_ASSETS=()

for project_file in "$PROJECTS_DIR"/*.md; do
    project_name=$(basename "$project_file" .md)

    # Skip if already has audioUrl or videoUrl
    if grep -q "^audioUrl:\|^videoUrl:" "$project_file"; then
        ((SKIPPED++)) || true
        continue
    fi

    PROJECTS_WITHOUT_ASSETS+=("$project_name")
    ((TOTAL++)) || true
done

echo "Found $TOTAL projects without NotebookLM assets"
echo "Skipped $SKIPPED projects with existing assets"
echo

if [ $TOTAL -eq 0 ]; then
    echo "All projects already have assets!"
    exit 0
fi

# Show what will be generated
echo "Will generate audio + video for:"
for project in "${PROJECTS_WITHOUT_ASSETS[@]}"; do
    echo "  - $project"
done
echo

echo -e "${YELLOW}Estimated time: $(($TOTAL * 6)) minutes (avg 6 min per project)${NC}"
echo -e "${YELLOW}NotebookLM daily quota: ~50 audio, ~50 video${NC}"
echo

read -p "Continue with batch generation? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Process each project
for i in "${!PROJECTS_WITHOUT_ASSETS[@]}"; do
    project="${PROJECTS_WITHOUT_ASSETS[$i]}"
    idx=$((i + 1))

    echo
    echo "[$idx/$TOTAL] Processing: $project"
    echo "----------------------------------------"

    # Read project metadata
    project_file="$PROJECTS_DIR/$project.md"
    title=$(grep "^title:" "$project_file" | head -1 | sed 's/^title: *"\?\(.*\)"\?$/\1/' | sed 's/"$//')
    date=$(grep "^date:" "$project_file" | head -1 | sed 's/^date: *//')

    # Create temp config
    config_file=$(mktemp)
    cat > "$config_file" <<EOF
{
  "title": "$title - Overview",
  "sources": [
    "textfile:$project_file"
  ],
  "studio": [
    {"type": "audio"},
    {"type": "video"}
  ]
}
EOF

    echo "  Config created: $config_file"
    echo "  Generating artifacts..."

    # Run automation
    export_dir="$NOTEBOOKLM_DIR/exports/$project"

    if cd "$NOTEBOOKLM_DIR" && ./scripts/automate-notebook.sh \
        --config "$config_file" \
        --export "./exports/$project" \
        --parallel > /dev/null 2>&1; then

        echo "  ✓ Generation complete"

        # Create asset directory
        mkdir -p "$PUBLIC_ASSETS/$project"

        # Move audio
        if [ -f "$export_dir/studio/audio"/*.mp3 ]; then
            cp "$export_dir/studio/audio"/*.mp3 "$PUBLIC_ASSETS/$project/audio.mp3"
            echo "  ✓ Audio moved to /public/notebook-assets/$project/audio.mp3"
        else
            echo "  ✗ Audio generation failed"
        fi

        # Move video
        if [ -f "$export_dir/studio/video"/*.mp4 ]; then
            cp "$export_dir/studio/video"/*.mp4 "$PUBLIC_ASSETS/$project/video.mp4"
            echo "  ✓ Video moved to /public/notebook-assets/$project/video.mp4"
        else
            echo "  ✗ Video generation failed"
        fi

        # Update project frontmatter (add audioUrl and videoUrl)
        cd "$REPO_ROOT"
        if ! grep -q "^audioUrl:" "$project_file"; then
            # Find the line after 'date:' and insert audioUrl
            sed -i '' "/^date:/a\\
audioUrl: \"/notebook-assets/$project/audio.mp3\"
" "$project_file"
            echo "  ✓ Added audioUrl to project frontmatter"
        fi

        if ! grep -q "^videoUrl:" "$project_file"; then
            # Find the line after 'audioUrl:' and insert videoUrl
            sed -i '' "/^audioUrl:/a\\
videoUrl: \"/notebook-assets/$project/video.mp4\"
" "$project_file"
            echo "  ✓ Added videoUrl to project frontmatter"
        fi

        # TODO: Create audio collection entry
        # This would need project description, tags, etc.
        # Skipping for now - can be done manually or in follow-up

        ((SUCCESS++)) || true
    else
        echo "  ✗ Generation failed"
        ((FAILED++)) || true
    fi

    # Cleanup
    rm -f "$config_file"

    # Rate limiting - pause between projects
    if [ $idx -lt $TOTAL ]; then
        echo "  Pausing 10 seconds before next project..."
        sleep 10
    fi
done

echo
echo "=== Batch Generation Complete ==="
echo "Total:     $TOTAL"
echo "Success:   $SUCCESS"
echo "Failed:    $FAILED"
echo "Skipped:   $SKIPPED"
echo

if [ $SUCCESS -gt 0 ]; then
    echo -e "${GREEN}Generated assets are in: public/notebook-assets/${NC}"
    echo -e "${GREEN}Project frontmatter updated with audioUrl/videoUrl${NC}"
    echo
    echo "Next steps:"
    echo "1. Review generated assets"
    echo "2. Create audio collection entries (src/content/audio/)"
    echo "3. Run: npm run build"
    echo "4. Commit changes"
fi
