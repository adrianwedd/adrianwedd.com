#!/usr/bin/env python3
"""Convert afterwords word-timestamp JSON into a WebVTT caption file.

Input  : JSON array of {"word", "start", "end"} (seconds) — `transcribe.py` output.
Output : WebVTT cues, grouped for readability (≤2 lines, ~42 chars/line).

Usage:
    python words_to_vtt.py words.json            # write captions.vtt beside input
    python words_to_vtt.py words.json -o out.vtt
    cat words.json | python words_to_vtt.py - -o out.vtt
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Cue boundary heuristics — tuned for NLM narration (clean, ~150 wpm).
MAX_WORDS = 10        # hard cap on words per cue
MAX_DURATION = 5.5    # seconds per cue
MAX_GAP = 0.7         # split on a silence gap longer than this
MIN_WORDS_FOR_PUNCT = 3  # don't split on "." after only 1–2 words
MAX_LINE = 42         # chars before wrapping to a second line
SENTENCE_END = (".", "!", "?")


def fmt_ts(t: float) -> str:
    # Round to integer milliseconds first, then carry with integer divmod.
    # Float divmod could leave a seconds field of 59.9996 that formats as
    # "60.000" at minute/hour boundaries — an invalid WebVTT timestamp.
    ms_total = max(0, int(round(t * 1000)))
    h, rem = divmod(ms_total, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def wrap(text: str) -> str:
    """Wrap a cue into at most two roughly balanced lines."""
    if len(text) <= MAX_LINE:
        return text
    words = text.split()
    line1, line2 = [], []
    cur = 0
    for i, w in enumerate(words):
        if cur + len(w) <= MAX_LINE and not line2:
            line1.append(w)
            cur += len(w) + 1
        else:
            line2.append(w)
    return " ".join(line1) + "\n" + " ".join(line2)


def group(words: list[dict]) -> list[dict]:
    cues: list[dict] = []
    cur: list[dict] = []

    def flush():
        if not cur:
            return
        text = " ".join(w["word"] for w in cur).strip()
        if not text:
            cur.clear()
            return
        start = cur[0]["start"]
        end = max(cur[-1]["end"], start + 0.4)
        # Avoid overlapping the previous cue.
        if cues and start < cues[-1]["end"]:
            start = cues[-1]["end"]
            end = max(end, start + 0.4)
        cues.append({"start": start, "end": end, "text": wrap(text)})
        cur.clear()

    for i, w in enumerate(words):
        cur.append(w)
        word = w["word"]
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["start"] - w["end"]) if nxt else 0.0
        dur = w["end"] - cur[0]["start"]
        end_sentence = word.endswith(SENTENCE_END) and len(cur) >= MIN_WORDS_FOR_PUNCT
        if (
            len(cur) >= MAX_WORDS
            or dur >= MAX_DURATION
            or gap > MAX_GAP
            or end_sentence
        ):
            flush()
    flush()
    return cues


def escape_cue(text: str) -> str:
    """Escape the three characters significant in WebVTT cue payloads so a
    transcribed `<`, `>` or `&` renders literally rather than as cue markup
    (`<b>`/`<i>`/timestamp tags) or a malformed entity. `&` must go first."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def to_vtt(words: list[dict]) -> str:
    out = ["WEBVTT", ""]
    for i, c in enumerate(group(words), 1):
        out.append(str(i))
        out.append(f"{fmt_ts(c['start'])} --> {fmt_ts(c['end'])}")
        out.append(escape_cue(c["text"]))
        out.append("")
    return "\n".join(out) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="words JSON file, or '-' for stdin")
    ap.add_argument("-o", "--out", help="output .vtt (default: stdout, or <input>.vtt)")
    args = ap.parse_args()

    raw = sys.stdin.read() if args.input == "-" else Path(args.input).read_text(encoding="utf-8")
    words = json.loads(raw)
    if not isinstance(words, list):
        print("error: expected a JSON array of word objects", file=sys.stderr)
        return 1

    vtt = to_vtt(words)
    out = args.out
    if not out and args.input != "-":
        out = str(Path(args.input).with_suffix(".vtt"))
    if out:
        Path(out).write_text(vtt, encoding="utf-8")
        print(f"wrote {out} ({vtt.count('-->')} cues)", file=sys.stderr)
    else:
        sys.stdout.write(vtt)
    return 0


if __name__ == "__main__":
    sys.exit(main())
