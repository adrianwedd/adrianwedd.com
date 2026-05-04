#!/usr/bin/env python3
"""
Upload NLM videos from R2 to YouTube and write youtubeUrl back to frontmatter.

Usage:
  python3 scripts/upload-videos-to-youtube.py [--dry-run] [--limit N] [--slug SLUG]
"""

import argparse
import re
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import yaml
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

TOKEN_PATH = Path.home() / '.config/adrianwedd/youtube-token.json'
CONTENT_DIRS = [
    Path('src/content/blog'),
    Path('src/content/projects'),
]
CHANNEL_ID = 'UC709-RgQ-IMi-GffU9guqUQ'  # @adrianwedd
PLAYLIST_ID = 'PLHCs2hYaGLAk4qe5za7rAh2j4YHRKdJXo'  # adrianwedd.com


def get_credentials():
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH))
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_PATH.write_text(creds.to_json())
    return creds


def parse_frontmatter(path: Path) -> dict:
    text = path.read_text()
    m = re.match(r'^---\n(.*?)\n---', text, re.DOTALL)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except Exception:
        return {}


def set_frontmatter_field(path: Path, key: str, value: str):
    text = path.read_text()
    m = re.match(r'^(---\n)(.*?)(\n---)', text, re.DOTALL)
    if not m:
        return
    fm_text = m.group(2)
    new_line = f"{key}: '{value}'"
    if re.search(rf'^{re.escape(key)}:', fm_text, re.MULTILINE):
        fm_text = re.sub(rf'^{re.escape(key)}:.*$', new_line, fm_text, flags=re.MULTILINE)
    else:
        fm_text += f"\n{new_line}"
    path.write_text(m.group(1) + fm_text + m.group(3) + text[m.end():])


def collect_videos(slug_filter=None) -> list[dict]:
    videos = []
    for content_dir in CONTENT_DIRS:
        for md_file in sorted(content_dir.glob('*.md')):
            fm = parse_frontmatter(md_file)
            video_url = fm.get('videoUrl', '')
            if not video_url or 'cdn.adrianwedd.com' not in video_url:
                continue
            if fm.get('youtubeUrl'):
                continue  # already uploaded
            if fm.get('draft'):
                continue
            slug = md_file.stem.replace('-post', '')
            if slug_filter and slug != slug_filter:
                continue
            videos.append({
                'file': md_file,
                'slug': slug,
                'title': fm.get('title', slug),
                'description': fm.get('description', ''),
                'video_url': video_url,
                'content_type': content_dir.name,
            })
    return videos


class QuotaExceeded(Exception):
    pass


def upload_video(yt, video: dict) -> str | None:
    site_url = (
        f"https://adrianwedd.com/{'blog' if video['content_type'] == 'blog' else 'projects'}/{video['slug']}/"
    )
    description = f"{video['description']}\n\n{site_url}" if video['description'] else site_url

    print(f"\n→ {video['title']}")
    print(f"  R2: {video['video_url']}")

    tmp_path = None
    r2_key = re.search(r'cdn\.adrianwedd\.com/(.+)', video['video_url'])
    local_path = Path('public') / r2_key.group(1) if r2_key else None

    if local_path and local_path.exists():
        upload_path = local_path
        size_mb = local_path.stat().st_size / 1_000_000
        print(f"  Local copy: {size_mb:.0f}MB")
    else:
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            tmp_path = Path(tmp.name)
        print(f"  Downloading...", end='', flush=True)
        req = urllib.request.Request(
            video['video_url'],
            headers={'User-Agent': 'Mozilla/5.0 (adrianwedd.com uploader)'},
        )
        try:
            with urllib.request.urlopen(req) as resp, open(tmp_path, 'wb') as f:
                f.write(resp.read())
            size_mb = tmp_path.stat().st_size / 1_000_000
            print(f" {size_mb:.0f}MB")
            upload_path = tmp_path
        except Exception as e:
            print(f" FAILED: {e}")
            tmp_path.unlink(missing_ok=True)
            return None

    print(f"  Uploading to YouTube...", end='', flush=True)
    try:
        body = {
            'snippet': {
                'title': video['title'],
                'description': description,
                'categoryId': '28',  # Science & Technology
            },
            'status': {
                'privacyStatus': 'public',
                'selfDeclaredMadeForKids': False,
            },
        }
        media = MediaFileUpload(str(upload_path), mimetype='video/mp4', resumable=True)
        request = yt.videos().insert(part='snippet,status', body=body, media_body=media)

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                print(f" {int(status.progress() * 100)}%", end='', flush=True)

        video_id = response['id']
        print(f" done → https://www.youtube.com/watch?v={video_id}")

        try:
            yt.playlistItems().insert(
                part='snippet',
                body={'snippet': {
                    'playlistId': PLAYLIST_ID,
                    'resourceId': {'kind': 'youtube#video', 'videoId': video_id},
                }},
            ).execute()
            print(f"  Added to playlist")
        except Exception as e:
            print(f"  Playlist add failed: {e}")

        return video_id
    except HttpError as e:
        if e.status_code in (403, 429) and 'quota' in str(e).lower():
            print(f" FAILED: quota exceeded")
            raise QuotaExceeded() from e
        print(f" FAILED: {e}")
        return None
    finally:
        if tmp_path:
            tmp_path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description='Upload NLM videos to YouTube')
    parser.add_argument('--dry-run', action='store_true', help='List videos without uploading')
    parser.add_argument('--limit', type=int, default=0, help='Max videos to upload (0 = all)')
    parser.add_argument('--slug', help='Upload a single content slug')
    args = parser.parse_args()

    videos = collect_videos(slug_filter=args.slug)
    if not videos:
        print("No videos found (all may already have youtubeUrl set).")
        return

    print(f"Found {len(videos)} video(s) without youtubeUrl:")
    for v in videos:
        print(f"  [{v['content_type']}] {v['slug']}")

    if args.dry_run:
        print("\n[dry-run mode — no uploads]")
        return

    creds = get_credentials()
    yt = build('youtube', 'v3', credentials=creds)

    count = 0
    for video in videos:
        if args.limit and count >= args.limit:
            print(f"\nReached limit of {args.limit}. Run again to continue.")
            break
        try:
            video_id = upload_video(yt, video)
        except QuotaExceeded:
            print(f"\nQuota exceeded after {count} upload(s). Run again after midnight PT.")
            break
        if video_id:
            yt_url = f'https://www.youtube.com/watch?v={video_id}'
            set_frontmatter_field(video['file'], 'youtubeUrl', yt_url)
            print(f"  ✓ youtubeUrl written to {video['file'].name}")
            count += 1
            time.sleep(2)  # avoid quota burst

    print(f"\nDone. {count} video(s) uploaded.")


if __name__ == '__main__':
    # Ensure we run from repo root
    if not Path('src/content').exists():
        print("Run from repo root: python3 scripts/upload-videos-to-youtube.py")
        sys.exit(1)
    main()
