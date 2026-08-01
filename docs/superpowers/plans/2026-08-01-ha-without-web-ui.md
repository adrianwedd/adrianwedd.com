# "Home Assistant Without the Web UI" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the blog post "Home Assistant Without the Web UI" with its full NLM kit (audio, cinematic video with signoff sting, infographic hero), audio-collection entry, YouTube upload, and social autopublish — per the spec at `docs/superpowers/specs/2026-08-01-ha-without-web-ui-design.md`.

**Architecture:** One feature branch, one merge. The merge is the publication event — the GitHub Pages deploy and the social-queue regeneration both fire on that single push to main. Every phase happens on the branch; `draft: false` from the start is safe because an unmerged branch serves nothing. Content flows: private-repo journal → sanitised reference doc (grepped) → post → NLM kit → R2/YouTube → frontmatter → merge.

**Tech Stack:** Astro 6 content collection (markdown), NotebookLM CLI pipeline (`scripts/notebooklm/`), ffmpeg (stream-copy only for A/V), cwebp/sharp, Cloudflare R2 (`scripts/upload-media-to-r2.sh`), YouTube (`scripts/upload-videos-to-youtube.py`).

## Global Constraints

- **Sanitisation (spec §4):** the unifi repo is never named, linked, or path-referenced. Grep every publishable artifact (post, sanitised reference doc) with BOTH: `grep -nE '192\.168\.|wedd\.au|UDR7|pi5-hailo|claude_code_key|unifi|docs/qa' <file>` and `grep -nE '\b[0-9a-f]{8}\b' <file>` (review hits manually; 6-digit colour codes don't match). Kept on purpose: `172.30.32.0/23`, username `pi`.
- **Never re-encode audio or video.** Copy NLM audio as-is to `.m4a` (it's AAC-in-MP4 regardless of the `.mp3` download name). All video ops are `-c copy`. Image conversion (PNG→WebP/JPG) is expected and NOT covered by this rule.
- **Permalink:** `/blog/home-assistant-without-the-web-ui/`. File is `src/content/blog/home-assistant-without-the-web-ui-post.md` (`slug()` strips `-post`). Never rename after merge.
- **Description is exactly 156 chars** (gate is ≤160 in `scripts/validate-content.js`). Copy it verbatim from the spec §3 frontmatter block.
- **`autopublish` goes in LAST** (Task 10 only), and is read via gray-matter — do NOT add it to the Zod schema in `src/content.config.ts`.
- **`videoUrl` must be in frontmatter before the YouTube upload** — `scripts/upload-videos-to-youtube.py` selects only non-draft posts with `videoUrl` and no `youtubeUrl`, and writes only `youtubeUrl` back; `videoUploadDate` is set manually.
- **Date race:** `scripts/generate-social-queue.mjs:119` silently drops posts whose `date` is before today (Hobart). Before the final merge, if past midnight Hobart relative to `date: 2026-08-01`, bump `date` to the merge day.
- **Every `.webp` heroImage needs a `.jpg` twin** (deploy gate; local build does not check).
- **No Claude attribution anywhere.** Australian English in prose.
- Commits: enumerate paths explicitly — never `git add -A`.

---

### Task 1: Branch and sanitised reference doc

**Files:**
- Create: `<scratchpad>/ha-ref-sanitised.md` (session scratchpad — NOT in either repo)
- Source (read-only): `~/unifi/docs/reference/claude-home-assistant-operations.md` @ `0ef8947`

**Interfaces:**
- Produces: the branch `blog/ha-without-web-ui`; the sanitised doc consumed by Task 2 (drafting reference) and Task 5 (NLM source).

- [ ] **Step 1: Create the branch**

```bash
cd /Users/adrian/repos/adrianwedd.com
git checkout -b blog/ha-without-web-ui
```

- [ ] **Step 2: Confirm the source doc is at the pinned commit**

```bash
git -C ~/unifi log -1 --format=%h -- docs/reference/claude-home-assistant-operations.md
```
Expected: `0ef8947`. If newer, read the diff since `0ef8947` and fold any corrections into the sanitised copy (the spec's §6 evidence standard was verified against `0ef8947` + live reads on 2026-08-01).

- [ ] **Step 3: Copy and sanitise**

Copy the source doc to the scratchpad as `ha-ref-sanitised.md`, then apply every row of spec §4's table:
- `192.168.0.200` / `.116` / `.236` → `<HA_HOST>` / `<other host>` as context requires
- `~/.ssh/claude_code_key` → `~/.ssh/<key>`
- Delete the five-row LLAT table entirely; keep its lessons as prose
- `/home/pi/frigate-nvr/.ha_token` → "an admin token on another box"
- `pi5-hailo` and other fleet hostnames → "another box on the fleet"
- `UDR7` / router model → "the router"
- `home.wedd.au` → `<external hostname>`
- Keep: `172.30.32.0/23`, username `pi`
- `SPARK`, `px-mind`, `picar` → keep only where already public on adrianwedd.com; otherwise "a consumer"
- Remove any reference to the unifi repo, its paths (`docs/qa/...`), or its issue numbers

- [ ] **Step 4: Run the sanitisation greps against the sanitised doc**

```bash
grep -nE '192\.168\.|wedd\.au|UDR7|pi5-hailo|claude_code_key|unifi|docs/qa' <scratchpad>/ha-ref-sanitised.md
grep -nE '\b[0-9a-f]{8}\b' <scratchpad>/ha-ref-sanitised.md
```
Expected: first grep zero hits; second grep — review every hit manually, each must be a non-identifier (or fix it).

---

### Task 2: Draft the post

**Files:**
- Create: `src/content/blog/home-assistant-without-the-web-ui-post.md`

**Interfaces:**
- Consumes: sanitised reference doc (Task 1) as the factual source; spec §5 as the outline; spec §6 for which claims are verified/corrected/narrowed.
- Produces: the post file with exactly this frontmatter (Tasks 3–10 edit only frontmatter, never the body's URL-bearing filename).

- [ ] **Step 1: Write frontmatter, verbatim from spec §3**

```yaml
---
title: 'Home Assistant Without the Web UI'
description: 'The login page died, so I stopped using it. Operating Home Assistant over its APIs: three auth channels, where to write, and what silently eats your change.'
date: 2026-08-01
tags: ['engineering', 'homelab', 'home-assistant', 'raspberry-pi', 'ai-agents', 'claude-code']
draft: false
---
```
No `autopublish`, no asset fields yet.

- [ ] **Step 2: Write the body — eleven sections + appendix, ~4,000 words, each section opening with the failure that produced it**

Follow spec §5's section list exactly (1 The forced move; 2 A shell first; 3 Three channels and a lever, incl. the `trusted_proxies: [172.30.32.0/23]` aside; 4 The reload-semantics table — the centrepiece; 5 The `.storage` rule with both QA refinements; 6 Config flows over REST incl. the DELETE-cascade; 7 Add-ons incl. `ha apps bogussubcommand`; 8 The four things that still need a browser, Tailscale route approval last and longest; 9 Exit 0 is not evidence; 10 Getting data in — MQTT discovery design decisions; 11 Standing rules + staleness note; 12 Appendix: prompts to hand your agent — the paste-able CLAUDE.md operating-rules block plus four task prompts per spec §5.12, placeholders only, no claim that isn't already in the body). Constraints while drafting:

- Every §6 "verified live" claim may be stated flatly; the conversation-agent claim ships only as the **corrected** behaviour (timestamp, not `"idle"`); the missing-`http:`-block error string is omitted (state the requirement only).
- §5.11's staleness quartet (2026.6.4/18.0/58/22 → 2026.7.4/18.1/57/15) is stated as "the source notes said / live reads returned" — **no citation of any file, path, repo, or issue number**.
- Cross-links in body prose: `/blog/there-is-no-api/` (the same house's router), `/blog/the-limits-of-the-walls/` (the discipline), `/blog/getting-google-nest-cameras-into-frigate-nvr/` (the same fleet). No "part 4" framing.
- Voice per `docs/DESIGN_CHARTER.md`: first-person immediate, no achievement listing, Australian English.

- [ ] **Step 3: Run the sanitisation greps against the post**

```bash
grep -nE '192\.168\.|wedd\.au|UDR7|pi5-hailo|claude_code_key|unifi|docs/qa' src/content/blog/home-assistant-without-the-web-ui-post.md
grep -nE '\b[0-9a-f]{8}\b' src/content/blog/home-assistant-without-the-web-ui-post.md
```
Expected: zero hits / manually-cleared hits, as in Task 1 Step 4.

---

### Task 3: Validation gates and first commit

**Files:**
- Modify: none beyond Task 2's post
- Generated: `public/og/blog/home-assistant-without-the-web-ui.png` (landscape text card — it generates at this stage because the post has **no `heroImage` yet** (`needsTextCard()` treats missing hero as needs-card), and it stays the og:image after Task 7 because the portrait infographic can't serve a landscape og slot; it is a committed artifact)

- [ ] **Step 1: Run the gates**

```bash
node scripts/validate-content.js
npm run lint
npm run build
```
Expected: all pass. Build output includes `[blog] created: home-assistant-without-the-web-ui.png` (or the card generates in Task 6's rebuild — commit it whenever it appears).

- [ ] **Step 2: Verify the rendered URL**

```bash
ls dist/blog/home-assistant-without-the-web-ui/index.html
```
Expected: exists (confirms `slug()` stripped `-post`).

- [ ] **Step 3: Commit**

```bash
git add src/content/blog/home-assistant-without-the-web-ui-post.md public/og/blog/home-assistant-without-the-web-ui.png
git commit -m "feat(blog): Home Assistant without the web UI — post, phase 1 (no assets, no autopublish)"
```
(If the og card didn't generate yet, commit the post alone and add the card in Task 6.)

---

### Task 4: Technical QA gate (unifi side)

**Files:** none modified until findings arrive.

**Interfaces:**
- Consumes: the committed post; the box (read-only) and the journal in `~/unifi`.
- Produces: a QA'd post. **Gate: Task 5 does not start until this clears.**

- [ ] **Step 1: Dispatch the QA engines — one identical broad brief**

Prompt (same text to all engines): review `src/content/blog/home-assistant-without-the-web-ui-post.md` for technical accuracy against Home Assistant's actual API behaviour and, where you have access, the reference doc at `~/unifi/docs/reference/claude-home-assistant-operations.md` and read-only checks against the box. Verify every stated endpoint, flag, and failure mode. Pay particular attention to the closing appendix of copy-paste agent prompts: every instruction in those prompts must be correct as written (readers will paste them verbatim), must use only placeholder identifiers, and must not contradict the body. Also check the post leaks nothing: no private IPs, hostnames, key names, router model, or private-repo paths. Report numbered findings with severity and concrete fix.

```bash
timeout 20m codex exec --full-auto "<prompt>" > <scratchpad>/codex-post-qa.txt 2>&1 &
agy --print-timeout 15m -p "<prompt>" --dangerously-skip-permissions > <scratchpad>/agy-post-qa.txt 2>&1 &
timeout 30m hermes -z "<prompt>" > <scratchpad>/hermes-post-qa.txt 2>&1 &
wait
```
(Timeout wrappers because `codex exec` can stall in batch mode — kill and relaunch with the blocking decision pre-resolved rather than waiting it out. A timed-out engine is a **non-report**: re-run it, don't count it as clean.)

- [ ] **Step 2: Verify each finding independently before applying** (read the journal / run a read-only check — do not apply a finding on an engine's say-so).

- [ ] **Step 3: Apply verified fixes, re-run Task 2 Step 3 greps + `node scripts/validate-content.js`, commit**

```bash
git add src/content/blog/home-assistant-without-the-web-ui-post.md
git commit -m "fix(blog): HA post — technical QA fixes"
```

---

### Task 5: NLM kit generation

**Files:**
- Create: `<scratchpad>/ha-nlm-config.json`
- Generated: `<scratchpad>/exports/ha-without-web-ui/studio/{audio,video,visual}/...` (UUID-named files)

**Interfaces:**
- Consumes: the QA'd post + the sanitised reference doc (both already grepped).
- Produces: raw NLM audio (`studio/audio/<uuid>.mp3`, actually AAC/MP4), cinematic video (`studio/video/<uuid>.mp4`), infographic PNG (`studio/visual/<uuid>.png`) — consumed by Tasks 6–7. **Export files are UUID-named, and the infographic lands under `studio/visual/`, not `studio/infographic/`** (`export-notebook.sh:522–534`).

**Why not one config for everything:** `automate-notebook.sh` extracts only `type` and `description` from each studio item — a `video_style_prompt`/`focus` key in the JSON is silently dropped, and its `generate-studio.sh` calls `nlm video create <id> -y` bare. The branded prompts must go through direct `nlm` calls (the pattern in `scripts/generate-all-videos.sh:389` and `scripts/regenerate-branded-infographics.sh:261`).

- [ ] **Step 1: Write the config — notebook + sources + audio only** (audio takes no style prompt, so the wrapper is safe for it)

```json
{
  "title": "Home Assistant Without the Web UI — Overview",
  "sources": [
    "textfile:/Users/adrian/repos/adrianwedd.com/src/content/blog/home-assistant-without-the-web-ui-post.md",
    "textfile:<scratchpad>/ha-ref-sanitised.md"
  ],
  "studio": [
    {"type": "audio"}
  ]
}
```

- [ ] **Step 2: Check auth, create notebook + audio, capture the notebook ID**

```bash
cd scripts/notebooklm
nlm login --status || nlm login   # --status is the non-interactive check (doctor.sh:119); bare `nlm login` opens an interactive OAuth flow, so only fall through to it on failure
./scripts/automate-notebook.sh --config <scratchpad>/ha-nlm-config.json --parallel
```
Expected: JSON summary — capture `<notebook_id>` from it (fallback: `nlm list notebooks --json`). Audio takes 2–10 min. (`textfile:` paths in the config are absolute because `add-sources.sh` resolves them against the cwd, which is `scripts/notebooklm/` here.)

- [ ] **Step 3: Generate video and infographic with the branded prompts, via nlm directly**

```bash
nlm video create <notebook_id> --format cinematic -y \
  --focus "Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34). Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones, no bright or neon colours. NO human figures, no faces, no hands. No stock footage — only original abstract animation. Motifs: scrolling monospace terminal glyphs, a login form that never loads, branching copper light-paths through a dark house floorplan, YAML fragments dissolving and re-forming, a steady green pulse that means nothing. Beat structure: open on the dead login page; traverse the three auth channels as branching light; the overwritten edit as ink washed away and rewritten; close on the quiet green pulse — exit 0 that is not evidence."

nlm infographic create <notebook_id> --orientation portrait -y \
  --focus "Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34). Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones, no bright or neon colours. Elegant editorial layout with strong typographic hierarchy. Professional data visualisation with muted, saturated colour palette. WCAG AA contrast ratios. Minimal, sophisticated, Australian dark-mode design."
```
(`nlm infographic create`, not `nlm create infographic` — the latter is broken in nlm 0.5.17.) Poll studio status with a **JSON field check**, never by grepping for "generating"; cinematic videos can run up to ~45 min.

- [ ] **Step 4: Export everything, then verify the takes are full-quality**

```bash
./scripts/export-notebook.sh <notebook_id> --output <scratchpad>/exports
# export-notebook.sh:293 appends a slugified-title subdirectory under --output;
# symlink it to the stable name every later task uses:
ln -s <scratchpad>/exports/<actual-slug-dir> <scratchpad>/exports/ha-without-web-ui
ffprobe -v error -show_entries format=duration,bit_rate -of default=nw=1 <scratchpad>/exports/ha-without-web-ui/studio/audio/*.mp3
```
(`--output` is a flag, not a positional argument. The slug dir is printed in the export log as `Output: …` — use that exact path in the `ln -s`.)
Expected: `bit_rate` ≈ 256000 (read it from **format**, not stream — stream bit_rate is empty on NLM AAC). Exactly one file per `studio/{audio,video,visual}/` (UUID names — use globs throughout Tasks 6–7). Keep every take; never delete a generated asset.

---

### Task 6: Asset review and image conversions

**Files:**
- Create: `public/notebook-assets/home-assistant-without-the-web-ui/infographic.webp`
- Create: `public/notebook-assets/home-assistant-without-the-web-ui/infographic.jpg`
- Generated (if not in Task 3): `public/og/blog/home-assistant-without-the-web-ui.png`

- [ ] **Step 1: Review the assets — sanitisation and fabrication pass (spec §4)**

Read every word of text on the infographic PNG (NLM infographics have previously fabricated statistics, titled the wrong essay, and garbled words). Spot-check the audio (start/middle/end) and video for spoken or on-screen identifiers from the §4 table. Any leak → regenerate with corrected sources; fabricated-but-clean claims on the infographic → regenerate or accept only if factually right.

- [ ] **Step 2: Convert infographic (this is an image; the no-re-encode rule does not apply)**

```bash
mkdir -p public/notebook-assets/home-assistant-without-the-web-ui
cwebp -q 80 <scratchpad>/exports/ha-without-web-ui/studio/visual/*.png -o public/notebook-assets/home-assistant-without-the-web-ui/infographic.webp
ffmpeg -y -i <scratchpad>/exports/ha-without-web-ui/studio/visual/*.png public/notebook-assets/home-assistant-without-the-web-ui/infographic.jpg
```
The `.jpg` twin comes from the original PNG, not the WebP. Expected: WebP ~150 KB.

- [ ] **Step 3: Rebuild so the og text card generates against the portrait hero, and commit images**

```bash
npm run build
git add public/notebook-assets/home-assistant-without-the-web-ui/infographic.webp public/notebook-assets/home-assistant-without-the-web-ui/infographic.jpg public/og/blog/home-assistant-without-the-web-ui.png
git commit -m "feat(blog): HA post — infographic hero + og twins"
```
(heroImage frontmatter lands in Task 7 with the other asset fields; the build here just proves the card path.)

---

### Task 7: Signoff sting, R2 upload, asset frontmatter

**Files:**
- Create: `assets/brand/signoff-sting.mp4` (committed — recovered canonical asset)
- Create: `public/notebook-assets/home-assistant-without-the-web-ui/audio.m4a` (staged for R2 — this path is what `upload-media-to-r2.sh` scans; confirm against the script's source before running)
- Create: `public/notebook-assets/home-assistant-without-the-web-ui/video.mp4` (staged for R2)
- Modify: `src/content/blog/home-assistant-without-the-web-ui-post.md` (frontmatter only)

- [ ] **Step 1: Recover the sting (once, canonical thereafter)** — first `cd` back to the repo root (Task 5 left the shell in `scripts/notebooklm/`; every command from here on assumes repo root)

```bash
cd /Users/adrian/repos/adrianwedd.com
curl -s -o <scratchpad>/the-index-video.mp4 https://cdn.adrianwedd.com/notebook-assets/the-index/video.mp4
# last keyframe = start of the concatenated sting segment
ffprobe -v error -skip_frame nokey -select_streams v:0 -show_entries frame=pts_time -of csv=p=0 <scratchpad>/the-index-video.mp4 | tail -3
ffmpeg -ss <last_keyframe_pts> -i <scratchpad>/the-index-video.mp4 -c copy assets/brand/signoff-sting.mp4
```
Verify visually: extract a frame (`ffmpeg -i assets/brand/signoff-sting.mp4 -frames:v 1 <scratchpad>/sting-check.png`) and confirm it is the adrianwedd.com signoff card, duration ≈3 s. If the last keyframe is not the sting boundary, walk back through the tail keyframes until the extracted segment starts on the card.

- [ ] **Step 2: Concat sting onto the new video — stream copy both sides**

```bash
printf "file '%s'\nfile '%s'\n" "$(ls <scratchpad>/exports/ha-without-web-ui/studio/video/*.mp4)" "$PWD/assets/brand/signoff-sting.mp4" > <scratchpad>/concat.txt
ffmpeg -f concat -safe 0 -i <scratchpad>/concat.txt -c copy <scratchpad>/video-with-sting.mp4
```
Verify: `ffprobe` duration = main + ~3 s; codec params of both inputs match (they share the NLM pipeline). Play the join.

- [ ] **Step 3: Stage media at the canonical paths (audio copied as-is — no transcode)**

```bash
cp <scratchpad>/exports/ha-without-web-ui/studio/audio/*.mp3 public/notebook-assets/home-assistant-without-the-web-ui/audio.m4a
cp <scratchpad>/video-with-sting.mp4 public/notebook-assets/home-assistant-without-the-web-ui/video.mp4
./scripts/upload-media-to-r2.sh
curl -s -o /dev/null -w "%{http_code}\n" https://cdn.adrianwedd.com/notebook-assets/home-assistant-without-the-web-ui/audio.m4a   # expect 200
curl -s -o /dev/null -w "%{http_code}\n" https://cdn.adrianwedd.com/notebook-assets/home-assistant-without-the-web-ui/video.mp4   # expect 200
```
Then remove the local **audio** copy only (R2-served, not git-served) — after its 200:
```bash
rm public/notebook-assets/home-assistant-without-the-web-ui/audio.m4a
```
**Keep the local `video.mp4` until after Task 9** — `upload-videos-to-youtube.py` prefers the local `public/...` copy and would otherwise re-download ~100 MB from the CDN (line ~105). It is deleted in Task 9 Step 3.

- [ ] **Step 4: Measure duration and write the asset frontmatter**

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 <scratchpad>/exports/ha-without-web-ui/studio/audio/*.mp3
```
Convert seconds → `M:SS`. Add to the post frontmatter:

```yaml
heroImage: '/notebook-assets/home-assistant-without-the-web-ui/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/home-assistant-without-the-web-ui/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/home-assistant-without-the-web-ui/video.mp4'
audioDuration: '<M:SS>'
```

- [ ] **Step 5: Validate and commit**

```bash
node scripts/validate-content.js && npm run build
git add assets/brand/signoff-sting.mp4 src/content/blog/home-assistant-without-the-web-ui-post.md
git commit -m "feat(blog): HA post — audio/video on CDN, hero + asset frontmatter; canonical signoff sting recovered"
```

---

### Task 8: Audio collection entry

**Files:**
- Create: `src/content/audio/home-assistant-without-the-web-ui-overview.md`

- [ ] **Step 1: Write the entry**

```markdown
---
title: 'Home Assistant Without the Web UI — Overview'
description: 'Audio deep dive: operating Home Assistant entirely over its APIs — three auth channels, reload semantics, and why exit 0 is not evidence.'
date: 2026-08-01
tags: ['notebooklm', 'home-assistant', 'homelab', 'engineering']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/home-assistant-without-the-web-ui/audio.m4a'
duration: '<same M:SS as Task 7>'
relatedPost: 'home-assistant-without-the-web-ui'
---

NotebookLM Studio overview generated from the post and its operational notes:
the login page died, and the box kept working — three auth channels, where a
change actually lands, and the failures that all reported success.

[Read the full post →](/blog/home-assistant-without-the-web-ui/)
```
(Description must be ≤160 chars — count it. Match `relatedPost` to the post slug exactly.)

- [ ] **Step 2: Validate and commit**

```bash
node scripts/validate-content.js && npm run build
git add src/content/audio/home-assistant-without-the-web-ui-overview.md
git commit -m "feat(audio): overview episode for the HA post"
```

---

### Task 9: YouTube upload

**Files:**
- Modify: `src/content/blog/home-assistant-without-the-web-ui-post.md` (frontmatter: `youtubeUrl` written by the script, `videoUploadDate` written manually)

- [ ] **Step 1: Verify channel identity, then upload**

The OAuth chooser has two decoy channels. The script uses the token at `~/.config/adrianwedd/youtube-token.json`; before upload, confirm the authenticated channel is `@AdrianWedd` (UC709…). Upload is **public** — standing rule, do not ask.

```bash
python3 scripts/upload-videos-to-youtube.py
```
Expected: it finds exactly one candidate (this post: non-draft, has `videoUrl`, no `youtubeUrl`), uploads, and writes `youtubeUrl` into the frontmatter itself.

- [ ] **Step 2: Write `videoUploadDate` manually** — ISO-8601 UTC of the actual upload, e.g. `videoUploadDate: 2026-08-01T09:30:00Z`.

- [ ] **Step 3: Remove the local video copy (now that YouTube has it), validate, commit**

```bash
rm public/notebook-assets/home-assistant-without-the-web-ui/video.mp4   # R2 + YouTube both confirmed; scratchpad export retains the original take
node scripts/validate-content.js
git add src/content/blog/home-assistant-without-the-web-ui-post.md
git commit -m "feat(blog): HA post — YouTube upload + videoUploadDate"
```

---

### Task 10: autopublish, date check, PR, merge

**Files:**
- Modify: `src/content/blog/home-assistant-without-the-web-ui-post.md` (add `autopublish: true`; possibly bump `date`)

- [ ] **Step 1: Date check (Hobart)**

```bash
TZ=Australia/Hobart date +%F
```
If the output is later than the post's `date`, set `date:` to today's Hobart date in BOTH the post and the audio entry (the queue's past-date guard silently drops stale dates; the audio entry should stay in step for ordering).

- [ ] **Step 2: Add `autopublish: true` to the post frontmatter** (post only — not the audio entry). Re-run:

```bash
node scripts/validate-content.js && npm run lint && npm run build
```

- [ ] **Step 3: Final sanitisation grep on everything publishable**

```bash
grep -nE '192\.168\.|wedd\.au|UDR7|pi5-hailo|claude_code_key|unifi|docs/qa' src/content/blog/home-assistant-without-the-web-ui-post.md src/content/audio/home-assistant-without-the-web-ui-overview.md
grep -nE '\b[0-9a-f]{8}\b' src/content/blog/home-assistant-without-the-web-ui-post.md
```
Expected: zero / manually-cleared, as before.

- [ ] **Step 4: Commit, push, PR**

```bash
git add src/content/blog/home-assistant-without-the-web-ui-post.md src/content/audio/home-assistant-without-the-web-ui-overview.md
git commit -m "feat(blog): HA post — autopublish live"
git push -u origin blog/ha-without-web-ui
gh pr create --title "Home Assistant without the web UI — post + full NLM kit" --body "<summary of phases; note the merge is the publication event>"
```

- [ ] **Step 5: Wait for CI (build + worker-csp are required checks; lighthouse is `workflow_dispatch`-only and will not appear in the PR checks at all — that's correct), then merge per the standing rule** (multi-engine QA has reported clean and CI is green → merge without asking).

```bash
gh pr checks --watch
gh pr merge --squash
```

- [ ] **Step 6: Post-merge verification**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://adrianwedd.com/blog/home-assistant-without-the-web-ui/   # 200 after deploy
```
Check the social-autopublish queue-sync run succeeded (`gh run list --workflow=social-autopublish.yml -L 1`) and that the queue contains the post scheduled for 09:00 Hobart on its `date`.

---

## Self-review notes

- Spec §2 out-of-scope items: no task touches them — confirmed.
- Spec §4: greps run in Tasks 1, 2, 4 (re-run), 10; NLM asset review is Task 6 Step 1.
- Spec §7 phases map: 1→Tasks 1–3, 2→Task 4, 3→Tasks 5–7, 4→Task 6 Step 2, 5→Task 8, 6→Task 9, 7→Task 10.
- `videoUrl` precedes Task 9's uploader (Task 7 Step 4) — matches the uploader's filter.
- No placeholder steps: every command is concrete; the two values discovered at runtime (`<last_keyframe_pts>`, `<M:SS>`) are produced by the immediately preceding command.
