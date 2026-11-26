#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / "check-youtube-operations.py"
EXCEPTIONS = ROOT / "youtube-monitor-exceptions.json"
FIXTURES = ROOT / "youtube-monitor-fixtures"

spec = importlib.util.spec_from_file_location("youtube_monitor", SCRIPT)
monitor = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(monitor)


class YouTubeOperationsMonitorTests(unittest.TestCase):
    def load(self, name: str):
        return json.loads((FIXTURES / name).read_text())

    def exceptions(self):
        return monitor.load_exceptions(EXCEPTIONS)

    def test_healthy_allows_private_legacy_and_multipart(self):
        report = monitor.reconcile(self.load("healthy.json"), self.exceptions())
        self.assertEqual(report["exit_code"], 0)
        self.assertEqual(report["status"], "healthy")
        self.assertEqual(report["counts"]["accepted_exceptions"], 1)
        self.assertFalse(any(item["code"] == "probable_duplicate_content" for item in report["actionable"]))

    def test_drift_finds_composite_duplicate_missing_video_date_and_backlog(self):
        report = monitor.reconcile(self.load("drift.json"), self.exceptions())
        self.assertEqual(report["exit_code"], 1)
        codes = Counter(item["code"] for item in report["actionable"])
        self.assertEqual(codes["probable_duplicate_content"], 1)
        self.assertEqual(codes["missing_upload_date"], 1)
        self.assertEqual(codes["site_video_missing"], 1)
        self.assertEqual(codes["upload_backlog"], 1)

    def test_incomplete_probe_is_unknown_not_healthy(self):
        report = monitor.reconcile(self.load("unknown.json"), self.exceptions())
        self.assertEqual(report["exit_code"], 2)
        self.assertEqual(report["status"], "unknown")

    def test_cdn_identity_requires_exact_https_hostname(self):
        self.assertTrue(monitor.is_cdn_video_url("https://cdn.adrianwedd.com/video.mp4"))
        self.assertFalse(monitor.is_cdn_video_url("http://cdn.adrianwedd.com/video.mp4"))
        self.assertFalse(monitor.is_cdn_video_url("https://cdn.adrianwedd.com.evil.example/video.mp4"))
        self.assertFalse(monitor.is_cdn_video_url("https://evil.example/cdn.adrianwedd.com/video.mp4"))
        self.assertFalse(monitor.is_cdn_video_url("https://cdn.adrianwedd.com@evil.example/video.mp4"))

    def test_cli_exit_codes_and_json_are_stable(self):
        for fixture, expected in (("healthy.json", 0), ("drift.json", 1), ("unknown.json", 2)):
            run = subprocess.run(
                [sys.executable, str(SCRIPT), "--fixture", str(FIXTURES / fixture), "--json"],
                text=True,
                capture_output=True,
            )
            self.assertEqual(run.returncode, expected, run.stderr)
            document = json.loads(run.stdout)
            self.assertEqual(document["schema_version"], 1)
            self.assertEqual(document["exit_code"], expected)


if __name__ == "__main__":
    unittest.main(verbosity=2)
