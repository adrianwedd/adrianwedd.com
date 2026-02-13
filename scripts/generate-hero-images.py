#!/usr/bin/env python3
"""Generate branded hero images (1200x600) for all projects missing heroImage."""

import os
import re
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PROJECTS_DIR = Path(__file__).parent.parent / "src" / "content" / "projects"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "images" / "projects"

BG_COLOR = (26, 24, 28)        # #1a181c
ACCENT_COLOR = (196, 139, 110) # #c48b6e
TEXT_COLOR = (226, 221, 216)   # #e2ddd8
MUTED_COLOR = (150, 142, 150) # #968e96
WIDTH, HEIGHT = 1200, 600


def get_font(size: int) -> ImageFont.FreeTypeFont:
    """Try system fonts, fall back to default."""
    candidates = [
        "/System/Library/Fonts/SFPro-Bold.otf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay-Bold.otf",
        "/Library/Fonts/Arial Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def get_regular_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/SFPro-Regular.otf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def parse_frontmatter(filepath: Path) -> dict:
    text = filepath.read_text()
    match = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}
    fm = {}
    for line in match.group(1).split("\n"):
        m = re.match(r'^(\w+):\s*"?(.*?)"?\s*$', line)
        if m:
            fm[m.group(1)] = m.group(2)
    return fm


def create_hero(title: str, description: str, slug: str) -> Path:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Accent bar at top
    draw.rectangle([0, 0, WIDTH, 4], fill=ACCENT_COLOR)

    # Accent dot
    draw.ellipse([60, 160, 76, 176], fill=ACCENT_COLOR)

    # Title
    title_font = get_font(48)
    wrapped_title = textwrap.fill(title, width=32)
    draw.multiline_text((100, 140), wrapped_title, font=title_font, fill=TEXT_COLOR, spacing=12)

    # Calculate title height for description placement
    title_bbox = draw.multiline_textbbox((100, 140), wrapped_title, font=title_font, spacing=12)
    desc_y = title_bbox[3] + 30

    # Description
    desc_font = get_regular_font(24)
    wrapped_desc = textwrap.fill(description, width=60)
    # Limit to 3 lines
    lines = wrapped_desc.split("\n")[:3]
    if len(lines) == 3 and len(wrapped_desc.split("\n")) > 3:
        lines[2] = lines[2].rstrip() + "..."
    wrapped_desc = "\n".join(lines)
    draw.multiline_text((100, desc_y), wrapped_desc, font=desc_font, fill=MUTED_COLOR, spacing=8)

    # Bottom: site name + accent line
    draw.rectangle([0, HEIGHT - 4, WIDTH, HEIGHT], fill=ACCENT_COLOR)
    site_font = get_regular_font(18)
    draw.text((100, HEIGHT - 50), "adrianwedd.com", font=site_font, fill=MUTED_COLOR)

    # Save
    output_path = OUTPUT_DIR / f"{slug}-hero.webp"
    img.save(output_path, "WEBP", quality=85)
    return output_path


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for md_file in sorted(PROJECTS_DIR.glob("*.md")):
        slug = md_file.stem
        fm = parse_frontmatter(md_file)

        # Skip if already has heroImage
        if fm.get("heroImage"):
            print(f"  SKIP {slug} (already has heroImage)")
            continue

        title = fm.get("title", slug)
        description = fm.get("description", "")
        output = create_hero(title, description, slug)
        print(f"  DONE {slug} -> {output}")


if __name__ == "__main__":
    main()
