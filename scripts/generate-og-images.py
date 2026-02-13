#!/usr/bin/env python3
"""Generate OG images (1200x630) for all projects."""

import os
import re
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PROJECTS_DIR = Path(__file__).parent.parent / "src" / "content" / "projects"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "images" / "og"

BG_COLOR = (26, 24, 28)        # #1a181c
ACCENT_COLOR = (196, 139, 110) # #c48b6e
TEXT_COLOR = (226, 221, 216)   # #e2ddd8
MUTED_COLOR = (150, 142, 150) # #968e96
WIDTH, HEIGHT = 1200, 630


def get_font(size: int) -> ImageFont.FreeTypeFont:
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


def create_og(title: str, description: str, slug: str) -> Path:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Accent bar at top
    draw.rectangle([0, 0, WIDTH, 6], fill=ACCENT_COLOR)

    # Title
    title_font = get_font(52)
    wrapped_title = textwrap.fill(title, width=28)
    draw.multiline_text((80, 120), wrapped_title, font=title_font, fill=TEXT_COLOR, spacing=14)

    # Description
    title_bbox = draw.multiline_textbbox((80, 120), wrapped_title, font=title_font, spacing=14)
    desc_y = title_bbox[3] + 36

    desc_font = get_regular_font(26)
    wrapped_desc = textwrap.fill(description, width=55)
    lines = wrapped_desc.split("\n")[:3]
    if len(lines) == 3 and len(wrapped_desc.split("\n")) > 3:
        lines[2] = lines[2].rstrip() + "..."
    wrapped_desc = "\n".join(lines)
    draw.multiline_text((80, desc_y), wrapped_desc, font=desc_font, fill=MUTED_COLOR, spacing=10)

    # Bottom bar + site name
    draw.rectangle([0, HEIGHT - 6, WIDTH, HEIGHT], fill=ACCENT_COLOR)
    site_font = get_font(22)
    draw.text((80, HEIGHT - 60), "adrianwedd.com", font=site_font, fill=ACCENT_COLOR)

    output_path = OUTPUT_DIR / f"{slug}.png"
    img.save(output_path, "PNG")
    return output_path


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for md_file in sorted(PROJECTS_DIR.glob("*.md")):
        slug = md_file.stem
        fm = parse_frontmatter(md_file)
        title = fm.get("title", slug)
        description = fm.get("description", "")
        output = create_og(title, description, slug)
        print(f"  DONE {slug} -> {output}")


if __name__ == "__main__":
    main()
