#!/usr/bin/env python3
"""
Backfill `videoUploadDate` in blog/project frontmatter from YouTube's real
snippet.publishedAt.

Why: VideoObject.uploadDate was derived from the POST's date, which is a
different event. A post dated in the future (drip-scheduled) with a video
uploaded today emitted an uploadDate in the future — false structured data, and
uploadDate is required for video rich results.

Usage: python3 scripts/backfill-video-upload-dates.py [--dry-run]
"""

import argparse
import re
import sys
from pathlib import Path

from googleapiclient.discovery import build
from importlib.machinery import SourceFileLoader

_up = SourceFileLoader('yt', str(Path(__file__).parent / 'upload-videos-to-youtube.py')).load_module()

CONTENT_DIRS = [Path('src/content/blog'), Path('src/content/projects')]
YT_ID = re.compile(r'(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    targets = []
    for d in CONTENT_DIRS:
        for path in sorted(d.glob('*.md')):
            text = path.read_text()
            m = re.match(r'^---\n(.*?)\n---', text, re.DOTALL)
            if not m:
                continue
            fm = m.group(1)
            url = re.search(r'^youtubeUrl:\s*[\'"]?(\S+?)[\'"]?\s*$', fm, re.M)
            if not url:
                continue
            if re.search(r'^videoUploadDate:', fm, re.M):
                continue  # already set
            vid = YT_ID.search(url.group(1))
            if vid:
                targets.append((path, vid.group(1)))

    if not targets:
        print('Nothing to backfill.')
        return 0
    print(f'{len(targets)} file(s) need videoUploadDate')

    yt = build('youtube', 'v3', credentials=_up.get_credentials())
    published: dict[str, str] = {}
    ids = [v for _, v in targets]
    for i in range(0, len(ids), 50):  # API caps id lists at 50
        batch = ids[i : i + 50]
        resp = yt.videos().list(part='snippet', id=','.join(batch)).execute()
        for item in resp.get('items', []):
            published[item['id']] = item['snippet']['publishedAt']

    missing = [v for v in ids if v not in published]
    if missing:
        # Don't invent a date: leave those files alone and say so.
        print(f'WARNING: no API result for {len(missing)} id(s): {missing}', file=sys.stderr)

    changed = 0
    for path, vid in targets:
        stamp = published.get(vid)
        if not stamp:
            continue
        text = path.read_text()
        new = re.sub(
            r'^(youtubeUrl:.*)$',
            lambda m: f"{m.group(1)}\nvideoUploadDate: {stamp}",
            text,
            count=1,
            flags=re.M,
        )
        if new != text:
            changed += 1
            print(f'  {path.name} -> {stamp}')
            if not args.dry_run:
                path.write_text(new)

    print(f'{"[dry-run] " if args.dry_run else ""}{changed} file(s) updated')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
