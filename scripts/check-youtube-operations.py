#!/usr/bin/env python3
"""Read-only reconciliation for adrianwedd.com YouTube operations.

This program never uploads, edits videos/playlists, writes frontmatter, changes
OAuth consent, or persists a refreshed token. It compares the site, configured
channel and playlist, and emits either a human report or stable JSON.

Exit codes:
  0  complete observation, no actionable drift
  1  complete observation, confirmed actionable drift
  2  observation incomplete (auth, quota, transport, or malformed input)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

CHANNEL_ID = "UC709-RgQ-IMi-GffU9guqUQ"
PLAYLIST_ID = "PLHCs2hYaGLAk4qe5za7rAh2j4YHRKdJXo"
TOKEN_PATH = Path.home() / ".config/adrianwedd/youtube-token.json"
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_EXCEPTIONS = SCRIPT_DIR / "youtube-monitor-exceptions.json"
CANONICAL_URL = re.compile(r"https://adrianwedd\.com/(?:blog|projects)/[^\s)]+/?")
YOUTUBE_ID = re.compile(r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})")


def normalise_url(value: str) -> str:
    return value.rstrip("/") + "/"


def normalise_title(value: str) -> str:
    return " ".join(value.casefold().split())


def finding(code: str, message: str, **context: Any) -> dict[str, Any]:
    return {"code": code, "message": message, "context": context}


def load_exceptions(path: Path) -> dict[str, Any]:
    document = json.loads(path.read_text())
    if document.get("schema_version") != 1:
        raise ValueError("exceptions schema_version must be 1")
    return document


def load_site_entries(repo_root: Path) -> list[dict[str, Any]]:
    try:
        import yaml
    except ImportError as error:
        raise RuntimeError("PyYAML is required for live repository inspection") from error

    entries: list[dict[str, Any]] = []
    for relative, route in (("src/content/blog", "blog"), ("src/content/projects", "projects")):
        directory = repo_root / relative
        for path in sorted(directory.glob("*.md")):
            text = path.read_text()
            match = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
            if not match:
                continue
            frontmatter = yaml.safe_load(match.group(1)) or {}
            if frontmatter.get("draft"):
                continue
            video_url = str(frontmatter.get("videoUrl") or "")
            youtube_url = str(frontmatter.get("youtubeUrl") or "")
            youtube_match = YOUTUBE_ID.search(youtube_url)
            slug = path.stem.removesuffix("-post")
            entries.append(
                {
                    "path": str(path.relative_to(repo_root)),
                    "title": str(frontmatter.get("title") or slug),
                    "canonical_url": f"https://adrianwedd.com/{route}/{slug}/",
                    "video_url": video_url,
                    "youtube_id": youtube_match.group(1) if youtube_match else None,
                    "video_upload_date": str(frontmatter.get("videoUploadDate") or "") or None,
                }
            )
    return entries


def live_snapshot(repo_root: Path) -> dict[str, Any]:
    """Read the API with an in-memory refresh. Never persist refreshed credentials."""
    site_entries = load_site_entries(repo_root)
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
    except ImportError as error:
        return {"site_entries": site_entries, "probe_error": {"kind": "dependency", "detail": str(error)}}

    try:
        credentials = Credentials.from_authorized_user_file(str(TOKEN_PATH))
        refreshed = False
        if not credentials.valid:
            credentials.refresh(Request())
            refreshed = True
        youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)
        channels = youtube.channels().list(part="id,snippet", mine=True).execute().get("items", [])
        playlists = (
            youtube.playlists().list(part="id,snippet,status", id=PLAYLIST_ID).execute().get("items", [])
        )
        playlist_items: list[str] = []
        page_token = None
        while True:
            response = (
                youtube.playlistItems()
                .list(
                    part="contentDetails",
                    playlistId=PLAYLIST_ID,
                    maxResults=50,
                    pageToken=page_token,
                )
                .execute()
            )
            playlist_items.extend(item["contentDetails"]["videoId"] for item in response.get("items", []))
            page_token = response.get("nextPageToken")
            if not page_token:
                break
        videos: list[dict[str, Any]] = []
        for offset in range(0, len(playlist_items), 50):
            response = (
                youtube.videos()
                .list(
                    part="snippet,status,contentDetails",
                    id=",".join(playlist_items[offset : offset + 50]),
                    maxResults=50,
                )
                .execute()
            )
            videos.extend(response.get("items", []))
        site_only_ids = sorted(
            {entry["youtube_id"] for entry in site_entries if entry.get("youtube_id")} - set(playlist_items)
        )
        for offset in range(0, len(site_only_ids), 50):
            response = (
                youtube.videos()
                .list(
                    part="snippet,status,contentDetails",
                    id=",".join(site_only_ids[offset : offset + 50]),
                    maxResults=50,
                )
                .execute()
            )
            videos.extend(response.get("items", []))
        return {
            "observed_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            "credentials_refreshed_in_memory": refreshed,
            "credentials_persisted": False,
            "channels": channels,
            "playlist": playlists[0] if playlists else None,
            "playlist_items": playlist_items,
            "videos": videos,
            "site_entries": site_entries,
            "probe_error": None,
        }
    except HttpError as error:
        text = str(error)
        status = getattr(getattr(error, "resp", None), "status", None)
        kind = "quota" if status in (403, 429) and "quota" in text.casefold() else "auth" if status == 401 else "api"
        return {"site_entries": site_entries, "probe_error": {"kind": kind, "status": status, "detail": text[:300]}}
    except Exception as error:  # incomplete observation is UNKNOWN, never healthy
        return {"site_entries": site_entries, "probe_error": {"kind": "probe", "detail": str(error)[:300]}}


def reconcile(snapshot: dict[str, Any], exceptions: dict[str, Any]) -> dict[str, Any]:
    actionable: list[dict[str, Any]] = []
    unknown: list[dict[str, Any]] = []
    accepted: list[dict[str, Any]] = []
    probe_error = snapshot.get("probe_error")
    if probe_error:
        unknown.append(finding("probe_incomplete", "YouTube observation did not complete", **probe_error))
        return result(snapshot, actionable, unknown, accepted)

    channels = snapshot.get("channels") or []
    channel_ids = [channel.get("id") for channel in channels]
    if channel_ids != [CHANNEL_ID]:
        actionable.append(finding("wrong_channel", "Authenticated channel does not match configured channel", observed=channel_ids))
    playlist = snapshot.get("playlist")
    if not playlist or playlist.get("id") != PLAYLIST_ID:
        actionable.append(finding("playlist_missing", "Configured playlist was not returned", playlist_id=PLAYLIST_ID))
    elif (playlist.get("status") or {}).get("privacyStatus") != "public":
        actionable.append(
            finding(
                "playlist_nonpublic",
                "Configured distribution playlist is not public",
                privacy=(playlist.get("status") or {}).get("privacyStatus"),
            )
        )

    playlist_ids = list(snapshot.get("playlist_items") or [])
    counts = Counter(playlist_ids)
    for video_id, count in sorted(counts.items()):
        if count > 1:
            actionable.append(finding("duplicate_playlist_item", "Video appears more than once in playlist", video_id=video_id, count=count))
    videos = {video.get("id"): video for video in snapshot.get("videos") or [] if video.get("id")}
    accepted_private = set(exceptions.get("accepted_private_playlist_ids") or [])
    canonical_groups: dict[tuple[str, str], list[str]] = defaultdict(list)
    for video_id in playlist_ids:
        video = videos.get(video_id)
        if not video:
            actionable.append(finding("playlist_video_missing", "Playlist video was not returned by videos.list", video_id=video_id))
            continue
        snippet, status = video.get("snippet") or {}, video.get("status") or {}
        privacy = status.get("privacyStatus")
        if privacy != "public":
            if video_id in accepted_private:
                accepted.append(finding("accepted_private_legacy", "Known private legacy playlist item", video_id=video_id, privacy=privacy))
            else:
                actionable.append(finding("playlist_video_nonpublic", "Playlist video is not public", video_id=video_id, privacy=privacy))
        if status.get("uploadStatus") != "processed":
            actionable.append(finding("playlist_video_unprocessed", "Playlist video is not fully processed", video_id=video_id, upload_status=status.get("uploadStatus")))
        for url in CANONICAL_URL.findall(snippet.get("description") or ""):
            canonical_groups[(normalise_url(url), normalise_title(snippet.get("title") or ""))].append(video_id)
    known_duplicates = {
        (normalise_url(item["canonical_url"]), normalise_title(item["title"])): item
        for item in exceptions.get("known_duplicate_groups") or []
    }
    for identity, ids in sorted(canonical_groups.items()):
        unique = sorted(set(ids))
        if len(unique) < 2:
            continue
        context = known_duplicates.get(identity, {})
        actionable.append(
            finding(
                "probable_duplicate_content",
                "Videos share canonical URL and normalised title",
                canonical_url=identity[0],
                title=identity[1],
                video_ids=unique,
                disposition=context.get("disposition"),
            )
        )

    site_entries = snapshot.get("site_entries") or []
    known_missing = {item["video_id"]: item for item in exceptions.get("known_missing_site_video_ids") or []}
    for entry in site_entries:
        if "cdn.adrianwedd.com" in (entry.get("video_url") or "") and not entry.get("youtube_id"):
            actionable.append(finding("upload_backlog", "Published CDN video has no YouTube URL", path=entry.get("path")))
        video_id = entry.get("youtube_id")
        if not video_id:
            continue
        video = videos.get(video_id)
        if not video:
            context = known_missing.get(video_id, {})
            actionable.append(finding("site_video_missing", "Site YouTube ID was not returned by the API", path=entry.get("path"), video_id=video_id, disposition=context.get("disposition")))
            continue
        snippet, status = video.get("snippet") or {}, video.get("status") or {}
        if snippet.get("channelId") != CHANNEL_ID:
            actionable.append(finding("site_video_wrong_channel", "Site video belongs to another channel", path=entry.get("path"), video_id=video_id, channel_id=snippet.get("channelId")))
        if video_id not in counts:
            actionable.append(finding("site_video_not_in_playlist", "Site video is absent from configured playlist", path=entry.get("path"), video_id=video_id))
        if status.get("privacyStatus") != "public":
            actionable.append(finding("site_video_nonpublic", "Site video is not public", path=entry.get("path"), video_id=video_id, privacy=status.get("privacyStatus")))
        if status.get("uploadStatus") != "processed":
            actionable.append(finding("site_video_unprocessed", "Site video is not fully processed", path=entry.get("path"), video_id=video_id, upload_status=status.get("uploadStatus")))
        description_urls = {normalise_url(url) for url in CANONICAL_URL.findall(snippet.get("description") or "")}
        if normalise_url(entry.get("canonical_url") or "") not in description_urls:
            actionable.append(finding("canonical_url_missing", "Video description lacks the entry canonical URL", path=entry.get("path"), video_id=video_id))
        if status.get("uploadStatus") == "processed" and not entry.get("video_upload_date"):
            actionable.append(finding("missing_upload_date", "Processed site video has no videoUploadDate", path=entry.get("path"), video_id=video_id, published_at=snippet.get("publishedAt")))
    return result(snapshot, actionable, unknown, accepted)


def result(snapshot: dict[str, Any], actionable: list[dict[str, Any]], unknown: list[dict[str, Any]], accepted: list[dict[str, Any]]) -> dict[str, Any]:
    exit_code = 2 if unknown else 1 if actionable else 0
    return {
        "schema_version": 1,
        "status": "unknown" if unknown else "drift" if actionable else "healthy",
        "exit_code": exit_code,
        "observed_at": snapshot.get("observed_at"),
        "credentials_refreshed_in_memory": bool(snapshot.get("credentials_refreshed_in_memory")),
        "credentials_persisted": bool(snapshot.get("credentials_persisted")),
        "counts": {
            "site_entries": len(snapshot.get("site_entries") or []),
            "playlist_entries": len(snapshot.get("playlist_items") or []),
            "unique_playlist_video_ids": len(set(snapshot.get("playlist_items") or [])),
            "api_videos": len(snapshot.get("videos") or []),
            "actionable": len(actionable),
            "unknown": len(unknown),
            "accepted_exceptions": len(accepted),
        },
        "actionable": sorted(actionable, key=lambda item: (item["code"], json.dumps(item["context"], sort_keys=True))),
        "unknown": sorted(unknown, key=lambda item: item["code"]),
        "accepted_exceptions": sorted(accepted, key=lambda item: item["code"]),
    }


def human_report(report: dict[str, Any]) -> str:
    counts = report["counts"]
    lines = [
        f"YouTube operations: {report['status'].upper()}",
        f"site={counts['site_entries']} playlist={counts['playlist_entries']} api={counts['api_videos']}",
    ]
    for item in report["unknown"]:
        lines.append(f"UNKNOWN {item['code']}: {item['message']}")
    for item in report["actionable"]:
        detail = ", ".join(f"{key}={value}" for key, value in item["context"].items() if value not in (None, "", []))
        lines.append(f"DRIFT {item['code']}: {item['message']}{' (' + detail + ')' if detail else ''}")
    for item in report["accepted_exceptions"]:
        lines.append(f"ACCEPTED {item['code']}: {item['message']} ({item['context'].get('video_id')})")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Read-only YouTube/site reconciliation")
    parser.add_argument("--fixture", type=Path, help="Use a deterministic snapshot instead of APIs")
    parser.add_argument("--exceptions", type=Path, default=DEFAULT_EXCEPTIONS)
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        exceptions = load_exceptions(args.exceptions)
        snapshot = json.loads(args.fixture.read_text()) if args.fixture else live_snapshot(args.repo_root)
        report = reconcile(snapshot, exceptions)
    except Exception as error:
        report = result({"probe_error": {"kind": "program", "detail": str(error)}}, [], [finding("monitor_failed", "Monitor could not run", detail=str(error))], [])
    print(json.dumps(report, indent=2, sort_keys=True) if args.json else human_report(report))
    return int(report["exit_code"])


if __name__ == "__main__":
    raise SystemExit(main())
