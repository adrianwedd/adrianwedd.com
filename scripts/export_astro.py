#!/usr/bin/env python3
"""Export NotebookLM artifacts or raw markdown to Astro blog posts.

Adapted from:
  - failure-first-embodied-ai/tools/convert_reports_to_astro.py
  - notebooklm/lib/export_obsidian.py

Usage:
  python3 scripts/export_astro.py <input> [options]

  <input> can be:
    - A NotebookLM export directory (with metadata.json, studio/, sources/)
    - A single markdown file
    - A directory of markdown files

Options:
  --tags TAG [TAG ...]    Tags to apply (default: ["research"])
  --target DIR            Output directory (default: src/content/blog/)
  --public-dir DIR        Public assets directory (default: public/)
  --dry-run               Show what would be created without writing
  --date YYYY-MM-DD       Override date (default: today)
  --draft / --no-draft    Set draft status (default: true)
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
from datetime import date
from pathlib import Path


def make_slug(title: str) -> str:
    """Create a URL-friendly slug from a title."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    slug = slug.strip("-")
    # Limit to first 8 words
    words = slug.split("-")[:8]
    slug = "-".join(words)
    # Guard against empty slugs (e.g. non-Latin titles)
    if not slug:
        slug = "post-" + hashlib.sha256(title.encode()).hexdigest()[:8]
    return slug


def extract_title(content: str, filename: str) -> str:
    """Extract title from markdown content or fall back to filename."""
    # Try first H1
    match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    # Try first non-empty line
    for line in content.splitlines():
        line = line.strip()
        if line and not line.startswith("---"):
            return line[:120]
    # Fall back to filename
    return Path(filename).stem.replace("-", " ").replace("_", " ").title()


def extract_description(content: str, max_len: int = 300) -> str:
    """Extract first meaningful paragraph as description."""
    # Strip existing frontmatter
    body = re.sub(r"^---\n.*?\n---\n?", "", content, count=1, flags=re.DOTALL)
    # Strip H1
    body = re.sub(r"^#\s+.+\n?", "", body, count=1)

    for para in re.split(r"\n{2,}", body.strip()):
        text = para.strip()
        # Skip headings, images, empty lines
        if not text or text.startswith("#") or text.startswith("!["):
            continue
        # Clean markdown formatting
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # links
        text = re.sub(r"[*_`]", "", text)  # emphasis
        text = text.replace("\n", " ").strip()
        if len(text) > max_len:
            text = text[: max_len - 3].rsplit(" ", 1)[0] + "..."
        return text

    return "Research summary."


def strip_frontmatter(content: str) -> str:
    """Remove existing YAML frontmatter if present."""
    # Handle both \n and \r\n line endings
    return re.sub(r"^---\r?\n.*?\r?\n---\r?\n?", "", content, count=1, flags=re.DOTALL)


def _yaml_escape(s: str) -> str:
    """Escape a string for safe inclusion in double-quoted YAML."""
    s = s.replace("\\", "\\\\").replace('"', '\\"')
    s = s.replace("\n", " ").replace("\r", "")
    return s


def build_frontmatter(
    title: str,
    description: str,
    post_date: str,
    tags: list[str],
    draft: bool = True,
    assets: dict[str, str] | None = None,
) -> str:
    """Build Astro-compatible YAML frontmatter."""
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", post_date):
        print(f"Warning: date '{post_date}' doesn't match YYYY-MM-DD", file=sys.stderr)
        post_date = date.today().isoformat()
    tag_str = json.dumps(tags)
    safe_title = _yaml_escape(title)
    safe_desc = _yaml_escape(description)
    lines = [
        "---",
        f'title: "{safe_title}"',
        f'description: "{safe_desc}"',
        f"date: {post_date}",
        f"tags: {tag_str}",
        f"draft: {str(draft).lower()}",
    ]
    if assets:
        for key, path in sorted(assets.items()):
            lines.append(f'{key}: "{path}"')
    lines.append("---")
    return "\n".join(lines)


# Map manifest asset types to frontmatter keys, directories, and filename patterns.
# The export script (notebooklm/scripts/export-notebook.sh) uses these naming conventions:
#   audio:      studio/audio/{id}.mp3
#   video:      studio/video/{id}.mp4
#   infographic: studio/visual/{id}.png
#   mind_map:   studio/visual/{id}.json
#   quiz:       studio/interactive/{id}-quiz.json
#   flashcards: studio/interactive/{id}-flashcards.json
#   data_table: studio/interactive/{id}-data-table.csv
#   slide_deck: studio/documents/{id}.pdf
#   report:     studio/documents/{id}.md  (used as blog post content, not an embedded asset)
_ASSET_TYPE_MAP = {
    "audio": {"key": "audioUrl", "dir": "audio", "patterns": ["{id}.mp3", "{id}.wav", "{id}.ogg"]},
    "video": {"key": "videoUrl", "dir": "video", "patterns": ["{id}.mp4", "{id}.webm"]},
    "infographic": {"key": "infographic", "dir": "visual", "patterns": ["{id}.png", "{id}.jpg", "{id}.jpeg", "{id}.webp", "{id}.svg"]},
    "mind_map": {"key": "mindmap", "dir": "visual", "patterns": ["{id}.json"]},
    "quiz": {"key": "quiz", "dir": "interactive", "patterns": ["{id}-quiz.json", "{id}.json"]},
    "flashcards": {"key": "flashcards", "dir": "interactive", "patterns": ["{id}-flashcards.json", "{id}.json"]},
    "data_table": {"key": "dataTable", "dir": "interactive", "patterns": ["{id}-data-table.csv", "{id}.csv", "{id}.json"]},
    "slide_deck": {"key": "slides", "dir": "documents", "patterns": ["{id}.pdf"]},
}


def copy_studio_assets(
    export_dir: Path,
    post_slug: str,
    public_dir: Path,
    dry_run: bool = False,
) -> dict[str, str]:
    """Copy studio assets to public/ and return frontmatter asset paths.

    Reads studio/manifest.json to discover assets, then finds matching files
    in the studio subdirectories.
    """
    manifest_path = export_dir / "studio" / "manifest.json"
    if not manifest_path.exists():
        return {}

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assets: dict[str, str] = {}
    asset_dir = public_dir / "notebook-assets" / post_slug

    # Track how many of each type we've seen (use first completed one)
    seen_types: set[str] = set()

    for entry in manifest:
        asset_type = entry.get("type", "")
        asset_id = entry.get("id", "")
        status = entry.get("status", "")

        if status != "completed" or not asset_id:
            continue

        type_info = _ASSET_TYPE_MAP.get(asset_type)
        if not type_info:
            continue

        # Only use first asset of each type
        if type_info["key"] in seen_types:
            continue

        # Find the actual file using known naming patterns
        studio_subdir = export_dir / "studio" / type_info["dir"]
        source_file = None
        for pattern in type_info["patterns"]:
            candidate = studio_subdir / pattern.format(id=asset_id)
            if candidate.exists():
                source_file = candidate
                break

        if not source_file:
            continue

        # Determine clean filename
        clean_name = f"{asset_type}{source_file.suffix}"
        dest_path = asset_dir / clean_name
        web_path = f"/notebook-assets/{post_slug}/{clean_name}"

        if dry_run:
            print(f"  [dry-run] Would copy: {source_file.name} -> {dest_path}")
        else:
            asset_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_file, dest_path)
            print(f"  Copied: {source_file.name} -> {dest_path}")

        assets[type_info["key"]] = web_path
        seen_types.add(type_info["key"])

    return assets


def process_markdown_file(
    filepath: Path,
    tags: list[str],
    post_date: str,
    draft: bool,
    assets: dict[str, str] | None = None,
) -> tuple[str, str, str]:
    """Process a single markdown file. Returns (slug, frontmatter+content, title)."""
    content = filepath.read_text(encoding="utf-8")
    title = extract_title(content, filepath.name)
    description = extract_description(content)
    body = strip_frontmatter(content)
    slug = make_slug(title)
    frontmatter = build_frontmatter(title, description, post_date, tags, draft, assets)
    return slug, f"{frontmatter}\n\n{body.strip()}\n", title


def process_notebooklm_export(
    export_dir: Path,
    tags: list[str],
    post_date: str,
    draft: bool,
    public_dir: Path | None = None,
    dry_run: bool = False,
) -> list[tuple[str, str, str]]:
    """Process a NotebookLM export directory. Returns list of (slug, content, title)."""
    results = []

    # Read metadata for notebook title
    metadata_path = export_dir / "metadata.json"
    notebook_title = None
    if metadata_path.exists():
        meta = json.loads(metadata_path.read_text(encoding="utf-8"))
        notebook_title = meta.get("title", "")

    # Process studio documents (reports)
    studio_docs = export_dir / "studio" / "documents"
    if studio_docs.exists():
        for md_file in sorted(studio_docs.glob("*.md")):
            # Pre-compute slug to copy assets to the right place
            content = md_file.read_text(encoding="utf-8")
            title = extract_title(content, md_file.name)
            slug = make_slug(title)

            # Copy studio assets for this post
            assets = {}
            if public_dir:
                assets = copy_studio_assets(export_dir, slug, public_dir, dry_run)

            slug, full_content, title = process_markdown_file(
                md_file, tags, post_date, draft, assets
            )
            results.append((slug, full_content, title))

    # If no studio docs, process source markdown files
    if not results:
        sources_dir = export_dir / "sources"
        if sources_dir.exists():
            for md_file in sorted(sources_dir.glob("*.md")):
                slug, content, title = process_markdown_file(
                    md_file, tags, post_date, draft
                )
                results.append((slug, content, title))

    # Fall back: if still nothing, check top-level markdown
    if not results:
        for md_file in sorted(export_dir.glob("*.md")):
            if md_file.name == "README.md":
                continue
            slug, content, title = process_markdown_file(
                md_file, tags, post_date, draft
            )
            results.append((slug, content, title))

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Export NotebookLM artifacts or markdown to Astro blog posts."
    )
    parser.add_argument(
        "input",
        type=Path,
        help="NotebookLM export directory, markdown file, or directory of markdown files",
    )
    parser.add_argument(
        "--tags",
        nargs="+",
        default=["research"],
        help="Tags to apply (default: research)",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=Path("src/content/blog"),
        help="Output directory (default: src/content/blog/)",
    )
    parser.add_argument(
        "--public-dir",
        type=Path,
        default=Path("public"),
        help="Public assets directory (default: public/)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created without writing",
    )
    parser.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="Post date (default: today)",
    )
    parser.add_argument(
        "--draft",
        action="store_true",
        default=True,
        help="Mark as draft (default)",
    )
    parser.add_argument(
        "--no-draft",
        action="store_true",
        help="Mark as published",
    )

    args = parser.parse_args()
    draft = not args.no_draft
    input_path: Path = args.input.resolve()

    if not input_path.exists():
        print(f"Error: {input_path} does not exist", file=sys.stderr)
        sys.exit(1)

    results: list[tuple[str, str, str]] = []

    if input_path.is_file() and input_path.suffix in (".md", ".mdx"):
        # Single markdown file
        slug, content, title = process_markdown_file(
            input_path, args.tags, args.date, draft
        )
        results.append((slug, content, title))

    elif input_path.is_dir():
        # Check if it's a NotebookLM export (has metadata.json or studio/)
        is_notebook = (input_path / "metadata.json").exists() or (
            input_path / "studio"
        ).exists()

        if is_notebook:
            results = process_notebooklm_export(
                input_path, args.tags, args.date, draft,
                public_dir=args.public_dir,
                dry_run=args.dry_run,
            )
        else:
            # Plain directory of markdown files
            for md_file in sorted(input_path.glob("*.md")):
                slug, content, title = process_markdown_file(
                    md_file, args.tags, args.date, draft
                )
                results.append((slug, content, title))
    else:
        print(f"Error: unsupported input: {input_path}", file=sys.stderr)
        sys.exit(1)

    if not results:
        print("No content found to export.", file=sys.stderr)
        sys.exit(1)

    target = args.target
    if not args.dry_run:
        target.mkdir(parents=True, exist_ok=True)

    seen_slugs: set[str] = set()
    for slug, content, title in results:
        # Deduplicate slugs to prevent silent overwrites
        original_slug = slug
        counter = 2
        while slug in seen_slugs:
            slug = f"{original_slug}-{counter}"
            counter += 1
        seen_slugs.add(slug)

        out_file = target / f"{slug}.md"
        if args.dry_run:
            print(f"[dry-run] Would create: {out_file}")
            print(f"          Title: {title}")
            print(f"          Tags:  {args.tags}")
            print()
        else:
            if out_file.exists():
                print(f"Skipped (exists): {out_file}")
                continue
            out_file.write_text(content, encoding="utf-8")
            print(f"Created: {out_file}")


if __name__ == "__main__":
    main()
