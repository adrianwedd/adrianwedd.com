# YouTube operations monitor

The YouTube uploader is intentionally manual because running it publishes a public video. The
monitor is read-only and may be scheduled independently.

```bash
python3 scripts/check-youtube-operations.py
python3 scripts/check-youtube-operations.py --json
python3 scripts/test_youtube_operations_monitor.py
```

The monitor compares non-draft site content with the configured Adrian Wedd channel and
`adrianwedd.com` playlist. It checks upload backlog, channel identity, playlist membership,
processing/privacy, canonical description links, missing `videoUploadDate`, missing videos and
probable duplicate uploads. A duplicate requires the same canonical URL **and** normalised title;
URL alone is insufficient because multipart films legitimately share one article.

Exit status is `0` for a complete healthy observation, `1` for confirmed drift and `2` when the
observation itself is incomplete. Authentication, quota, transport and malformed-data failures
are unknown, never healthy. OAuth refresh happens in memory and is not written back by the
monitor.

Known legacy state is explicit in `scripts/youtube-monitor-exceptions.json`. Accepted exceptions
are reported rather than silently forgotten. Actionable exceptions remain findings until a human
content/channel decision resolves them; the monitor never deletes or edits anything.

`scripts/launchd/com.adrianwedd.youtube-monitor.plist.example` is a template only. It has not been
installed. If adopted, the scheduler should report state transitions to private operations issue
`adrianwedd-ops#139`; it must not invoke the uploader or turn a backlog finding into publication.

YouTube Data API calls can identify a quota-exhaustion error but cannot report trustworthy quota
remaining. Cloud project access or exported Cloud Monitoring data would be needed for that claim.
