#!/usr/bin/env python3
"""Update YouTube video descriptions with rich content for all uploaded videos.

Uses videos.update (50 units each) — far cheaper than re-uploading.
Run after all youtubeUrl frontmatter is merged to main.
"""

import argparse
import re
import time
from pathlib import Path

import yaml
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

TOKEN_PATH = Path.home() / '.config/adrianwedd/youtube-token.json'
CONTENT_DIRS = [Path('src/content/blog'), Path('src/content/projects')]
FOOTER = "─────────────────────────\nAdrian Wedd · AI safety, agents, and systems thinking\nhttps://adrianwedd.com"


def get_credentials():
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH))
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_PATH.write_text(creds.to_json())
    return creds


def parse_fm(path):
    text = path.read_text()
    m = re.match(r'^---\n(.*?)\n---\n(.*)', text, re.DOTALL)
    if not m:
        return {}, ''
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except Exception:
        fm = {}
    return fm, m.group(2).strip()


def clean_body(body):
    body = re.sub(r'```.*?```', '', body, flags=re.DOTALL)
    body = re.sub(r'`[^`]+`', '', body)
    body = re.sub(r'!\[.*?\]\(.*?\)', '', body)
    body = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', body)
    body = re.sub(r'^#{1,6}\s+', '', body, flags=re.MULTILINE)
    body = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', body)
    body = re.sub(r'\n{3,}', '\n\n', body)
    return body.strip()


def build_description(fm, body, slug, content_type):
    site_url = f"https://adrianwedd.com/{'blog' if content_type == 'blog' else 'projects'}/{slug}/"
    blurb = fm.get('description', '')
    tags = fm.get('tags', [])
    audio_url = fm.get('audioUrl', '')
    repo = fm.get('repo', '')
    series = fm.get('series', '')
    series_order = fm.get('seriesOrder', '')

    clean = clean_body(body)
    paragraphs = [p.strip() for p in clean.split('\n\n') if len(p.strip()) > 80]
    excerpt = '\n\n'.join(paragraphs[:3])
    if len(excerpt) > 900:
        excerpt = excerpt[:897] + '...'

    parts = []
    if blurb:
        parts.append(blurb)
    if series:
        parts.append(f"Part {series_order} of the {series} series." if series_order else f"Part of the {series} series.")
    if excerpt:
        parts.append(excerpt)

    parts.append(f"Read the full article: {site_url}")
    if audio_url:
        parts.append(f"Audio version: {audio_url}")
    if repo:
        parts.append(f"Source code: {repo}")

    parts.append(FOOTER)

    if tags:
        hashtags = ' '.join(f"#{t.replace('-', '').replace(' ', '')}" for t in tags[:8])
        parts.append(hashtags)

    return '\n\n'.join(parts)[:4990]


def collect_videos():
    videos = []
    for content_dir in CONTENT_DIRS:
        for md_file in sorted(content_dir.glob('*.md')):
            fm, body = parse_fm(md_file)
            if fm.get('draft') or not fm.get('youtubeUrl'):
                continue
            yt_match = re.search(r'v=([A-Za-z0-9_-]+)', fm['youtubeUrl'])
            if not yt_match:
                continue
            slug = md_file.stem.replace('-post', '')
            videos.append({
                'yt_id': yt_match.group(1),
                'title': fm.get('title', slug),
                'slug': slug,
                'content_type': content_dir.name,
                'fm': fm,
                'body': body,
            })
    return videos


def main():
    parser = argparse.ArgumentParser(description='Update YouTube video descriptions')
    parser.add_argument('--dry-run', action='store_true', help='Preview descriptions without updating')
    parser.add_argument('--slug', help='Update a single slug only')
    args = parser.parse_args()

    videos = collect_videos()
    if args.slug:
        videos = [v for v in videos if v['slug'] == args.slug]

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Updating {len(videos)} video descriptions (50 units each = {len(videos) * 50} units total)\n")

    if not args.dry_run:
        yt = build('youtube', 'v3', credentials=get_credentials())

    updated = 0
    for v in videos:
        desc = build_description(v['fm'], v['body'], v['slug'], v['content_type'])
        print(f"→ {v['title'][:60]}")
        print(f"  ID: {v['yt_id']} | {len(desc)} chars")

        if args.dry_run:
            print(f"  [preview] {desc[:120].replace(chr(10), ' ')}...")
            print()
            continue

        try:
            yt.videos().update(
                part='snippet',
                body={
                    'id': v['yt_id'],
                    'snippet': {
                        'title': v['title'],
                        'description': desc,
                        'categoryId': '28',
                    },
                },
            ).execute()
            print(f"  ✓ Updated")
            updated += 1
            time.sleep(1)
        except HttpError as e:
            if e.status_code in (403, 429):
                print(f"  ✗ Quota exceeded — stopping")
                break
            print(f"  ✗ Error: {e}")

    print(f"\n{'Would update' if args.dry_run else 'Updated'} {updated if not args.dry_run else len(videos)} videos")


if __name__ == '__main__':
    main()
