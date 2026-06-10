# Eight Minutes Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three-part "Eight Minutes" blog series (the human story of the 2026-06-10 phishing incident) with Lyria tracks, NLM heroes/trailer/overview, gated publication per the approved spec.

**Architecture:** Three blog posts + three audio-collection entries in Astro content collections, all `draft: true` until the spec's publication gate clears. Assets generated outside the repo (Lyria in `~/repos/failure-first-embodied-ai`, NLM via MCP/scripts), media served from R2, infographics committed.

**Tech Stack:** Astro 6 content collections, NotebookLM automation (`scripts/notebooklm/`), Lyria 3 Pro (sibling repo tooling), ffmpeg/cwebp, Cloudflare R2 (`scripts/upload-media-to-r2.sh`).

**Spec:** `docs/superpowers/specs/2026-06-10-eight-minutes-series-design.md` — read it before starting. It carries Adrian's disclosure rules (what's named, defanged, never published); the per-task notes below just point to where they apply. Applying them is the author's call, not a gate.

**Lyria brief:** `docs/superpowers/specs/2026-06-10-eight-minutes-lyria-brief.md` — the self-contained scoring brief (API call shape, Part 1 musical direction verbatim, the extraction method in §3, register shifts for Parts 2–3). Phase 2 follows it. Its §0 warning is binding: copy API plumbing from the probe tooling, never its payloads, audio, or lyrics.

**Branch:** `feat/eight-minutes-series` (exists, local-only).

**Facts source:** `~/incidents/2026-06-10-google-aitm-phishing/` — `writeup-public.md` (narrative seed), `TIMELINE.md` (times), `REPORT.md` (§2.1 audit corroboration, §9 infra). Read for facts. Never commit anything from that folder.

**Phase gates (do not cross without the stated condition):**
- Phase 1 (posts): now.
- Phase 2 (Lyria) needs Adrian's sign-off on lyrics and take selection.
- Phase 3 (NLM) needs Phase 1 committed (NLM sources = finished post files).
- Phase 4 (publication) needs every box in the spec's "Publication gate" ticked. NOT before.

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/content/blog/eight-minutes-the-trap.md` | create | Part 1 — dread |
| `src/content/blog/eight-minutes-the-fall.md` | create | Part 2 — vertigo → relief |
| `src/content/blog/eight-minutes-the-fight.md` | create | Part 3 — agency, FAQ, CTA |
| `src/content/audio/eight-minutes-the-armature.md` | create | Track 1 entry (dread) |
| `src/content/audio/eight-minutes-eighty-six.md` | create | Track 2 entry (vertigo) |
| `src/content/audio/eight-minutes-two-minutes.md` | create | Track 3 entry (agency) |
| `public/notebook-assets/eight-minutes-the-{trap,fall,fight}/infographic.{webp,jpg}` | create | Committed heroes |
| `public/notebook-assets/eight-minutes-the-{trap,fall,fight}/track.mp3` | create, NOT committed | Lyria tracks → R2 |
| `public/notebook-assets/eight-minutes-the-trap/video.mp4` | create, NOT committed | Trailer → R2 |
| `public/notebook-assets/eight-minutes-the-fight/audio.mp3` | create, NOT committed | NLM overview → R2 |

Asset placement decisions (locked here so tasks agree):
- Tracks live ONLY as audio-collection entries; blog posts link to them in prose.
- Part 1 blog carries `videoUrl` (trailer). Part 3 blog carries `audioUrl` (NLM overview). Part 2 blog carries neither.
- Track working titles (Adrian may rename at review): **The Armature** (P1), **Eighty-Six** (P2), **Two Minutes** (P3).

---

## Phase 1 — The posts

### Task 1: Part 1 — The Trap

**Files:**
- Create: `src/content/blog/eight-minutes-the-trap.md`

- [ ] **Step 1: Re-read sources** — `writeup-public.md` (lure + mechanism sections), `TIMELINE.md` 04:04–04:13 UTC entries, `REPORT.md` §3.1, §3.3. Note: all in-post times in AEST (UTC+10) with UTC in parentheses on first use.

- [ ] **Step 2: Write the post.** Frontmatter exactly:

```yaml
---
title: 'The Trap'
description: "Eight Minutes #1: the vishing call, the case number, and a lure genuinely signed by Google — why every check I'd been taught to run came back green."
date: 2026-06-10
tags: ['security', 'phishing', 'social engineering', 'incident response']
draft: true
series: 'Eight Minutes'
seriesOrder: 1
heroImage: '/notebook-assets/eight-minutes-the-trap/infographic.webp'
---
```

(heroImage path is forward-declared; the file lands in Task 8. `npm run build` tolerates a missing heroImage file but the deploy gate does not — heroes must exist before any merge.)

Body beats, in order (900–1300 words, first person, present tense for the attack itself):
1. **The call.** 14:04 on a Tuesday afternoon (04:04 UTC). A calm American voice, a case number, a named "support agent". Per the spec's disclosure rules, the phone number is framed as a spoofable caller ID: *"The number on my screen — +1 650‑918‑0851 — is a caller ID, and caller IDs are spoofable; whoever legitimately holds that number is almost certainly not the attacker."*
2. **The lure that was real.** The support emails arrived signed and delivered by Google itself — the attacker seeded Google's Support Cases auto-responder from lookalike `google-management[.]com`, so DKIM, SPF and DMARC all passed. Spell out the trap: every authenticity check I'd teach someone to run came back green because the message genuinely came from Google's infrastructure; only the *intent* was forged.
3. **The pressure.** The coached "secure your account" password reset at 14:11 (04:11:56 UTC). What the voice said, how reasonable it sounded, the manufactured urgency. Human texture from `writeup-public.md` — busy afternoon, divided attention.
4. **The tap.** Device prompt number 86 appears. The advice says check the number matches. It matched — because the attacker had just triggered the real challenge with my freshly-harvested password. End the post on the tap itself; no resolution. One forward line: *"Part 2 is the eight minutes that tap bought them."*
5. Footer: series nav line linking the (future) other parts; em-dash note that this is a true first-party account, evidence preserved.

Per the spec's disclosure rules, this post: refers to "a page on Google Sites" rather than the URL, keeps the case number as "a case number" (no digits), omits the home IP. (These are Adrian's published rules — apply as written or adjust at review.)

- [ ] **Step 3: Validate**

Run: `node scripts/validate-content.js`
Expected: validator passes (description is 147 chars, under 160).

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/eight-minutes-the-trap.md
git commit -m "feat(series): Eight Minutes #1 — The Trap (draft)"
```

### Task 2: Part 2 — The Fall

**Files:**
- Create: `src/content/blog/eight-minutes-the-fall.md`

- [ ] **Step 1: Re-read sources** — `TIMELINE.md` 04:13–04:36 UTC, `REPORT.md` §2.1 (server-side corroboration), §3.2, §6.1a (Binance freeze).

- [ ] **Step 2: Write the post.** Frontmatter exactly:

```yaml
---
title: 'The Fall'
description: "Eight Minutes #2: inside the eight authenticated minutes — the live relay, the Binance pivot, and the safety nets that fired after I'd already been beaten."
date: 2026-06-10
tags: ['security', 'phishing', 'account takeover', 'incident response']
draft: true
series: 'Eight Minutes'
seriesOrder: 2
heroImage: '/notebook-assets/eight-minutes-the-fall/infographic.webp'
---
```

Body beats (1000–1400 words):
1. **The other side of the glass.** While I typed into the lookalike page (`view-support[.]com` — defanged), a human operator retyped everything into the real Google login, a beat behind me. The relay framing: my keystrokes, their session.
2. **They're in.** 14:21:34 (04:21:34 UTC): `login_success` from 103.120.6.237 — a rented VPS (as of June 2026; these addresses get reassigned) — with Google's own log flagging `is_suspicious=True`. I know the exact second because months of this story were later reconstructed from Google's server-side audit logs, not memory.
3. **The pivot.** Within seven minutes they were in Binance via the universal backdoor — the inbox password reset (04:28, Binance's own security emails name the same IP, as of June 2026). Email is the master key: own the inbox, own everything the inbox can reset. One restrained line acknowledging they also went looking through my files (no wallet-file detail — spec).
4. **Tidying up.** They binned the security alerts — the four genuine Google warnings went straight to Trash so I wouldn't see them. (Recovered later, which is its own Part 3 story.)
5. **The nets.** Four attempts to add their own permanent sign-in method; Google's risk engine blocked all four. Binance auto-froze withdrawals for 24 hours after the reset. Neither net was me.
6. **The reset.** 14:36 (04:36:09 UTC): my password reset killed their session. Eight authenticated minutes, end to end.
7. **The nuance** — keep it (it's the one technical correction that matters): *"Strictly, this wasn't the cookie-stealing adversary-in-the-middle of the textbooks: nothing was stolen from my session, because there was no session to steal. They minted their own — I granted it. That's also why a simple password reset could end it."*
8. Close on the score: attacker 1, me 0, automated systems 2. Forward line to Part 3.

- [ ] **Step 3: Validate**

Run: `node scripts/validate-content.js`
Expected: passes (description is 151 chars).

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/eight-minutes-the-fall.md
git commit -m "feat(series): Eight Minutes #2 — The Fall (draft)"
```

### Task 3: Part 3 — The Fight

**Files:**
- Create: `src/content/blog/eight-minutes-the-fight.md`

- [ ] **Step 1: Re-read sources** — `REPORT.md` §2.1, §7 (evidence index), §9 (passive recon), `abuse-reports/README.md` (dispatch table).

- [ ] **Step 2: Write the post.** Frontmatter exactly (note `faq` — rendered as FAQPage JSON-LD by `blog/[...slug].astro`):

```yaml
---
title: 'The Fight'
description: "Eight Minutes #3: a packet capture taken mid-attack, Google's own audit logs, eight abuse reports, and the passkey that ends the story."
date: 2026-06-10
tags: ['security', 'phishing', 'digital forensics', 'incident response']
draft: true
series: 'Eight Minutes'
seriesOrder: 3
heroImage: '/notebook-assets/eight-minutes-the-fight/infographic.webp'
faq:
  - q: 'What is a real-time relay phishing attack?'
    a: 'An attack where a human operator relays your credentials and 2FA approvals into the real site as you type them into a fake one. Everything you check — sender, domain, the matching prompt number — is genuine, because the attacker is triggering the real flows. Only the context is fake.'
  - q: "Why didn't two-factor authentication stop it?"
    a: 'Codes and one-tap prompts can be relayed. The prompt number matched because the attacker triggered the real challenge with the password they had just captured. Any 2FA a human can read or approve, a human can be tricked into handing over.'
  - q: 'What is the only widely available 2FA that resists this?'
    a: 'Passkeys and hardware security keys. The credential is bound to the real domain and never passes through you, so there is nothing for an operator to relay.'
  - q: 'What should I do right now?'
    a: "Enrol a passkey on your email account — it takes about two minutes. Never approve a login prompt you didn't personally start. Move financial-account 2FA off email and SMS."
---
```

Body beats (1100–1500 words):
1. **Capture first, panic later.** Realising mid-attack and choosing to record: the full network capture of the live phishing session (880 requests) taken while it was still running. That capture is the only reason the Binance pivot was ever discovered.
2. **Recovering the deleted warnings.** The four binned Google alerts pulled back out of Trash; the critical alert that survived on the recovery account. The attacker had delete access for eight minutes and used it to blind me.
3. **Asking Google what Google saw.** The Workspace audit-log pull: server-side confirmation of the attacker's login second, the suspicious-flag, the four blocked persistence attempts, and — the relief — only three password changes in the log, all mine. Reconstruction upgraded from "alert emails + a capture" to first-party logs at both ends (Google's audit log and Binance's own security emails name the same attacker IP, as of June 2026).
4. **Mapping the kit without touching it.** Passive-only recon (certificate transparency, urlscan, RDAP) — no packets to attacker hosts. The find that reframed everything: the lure page was publicly scanned six days before my call. This was a production line, not a spear.
5. **Eight reports.** The dispatch table in impact order: origin host, registrar, Cloudflare, the attacker-IP host, Safe Browsing, Google's own Sites/Cases teams, blocklists, and Australia's ReportCyber. Plain sentence that ReportCyber was filed (no reference number — spec).
6. **What happened next.** `<!-- GATE: takedown-outcomes — filled at publish time from the incident folder, "as of <cut-off date>" framing per spec. Do not publish with this comment present. -->`
7. **The ending.** Passkeys enrolled. Why that's the actual fix and not hygiene theatre: the decision moves off the human. Reprise of the writeup's closer: *"go enrol a passkey on your email account right now. It takes two minutes. I'll wait."*
8. Series nav footer linking Parts 1–2; one conditional line for the failurefirst.ai deep-dive **only if it is live at publish time** (spec: nothing depends on it).

- [ ] **Step 3: Validate**

Run: `node scripts/validate-content.js`
Expected: passes (description is 138 chars).

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/eight-minutes-the-fight.md
git commit -m "feat(series): Eight Minutes #3 — The Fight (draft, outcomes gated)"
```

### Task 4: Series-level verification

- [ ] **Step 1: Cross-link pass** — every post links the other two by final URL (`/blog/eight-minutes-the-trap/` etc.); Part 1 forward line, Part 3 back links. Verify with:

Run: `grep -c "/blog/eight-minutes-" src/content/blog/eight-minutes-*.md`
Expected: ≥2 per file.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean build. Draft posts are excluded from output — confirm with `ls dist/blog/ | grep eight-minutes` returning nothing.

- [ ] **Step 3: Adrian reviews all three drafts.** STOP — do not start Phase 2 until the text is approved; the posts are the NLM sources and the lyric basis.

- [ ] **Step 4: Commit any review edits**

```bash
git add src/content/blog/eight-minutes-*.md
git commit -m "fix(series): review edits to Eight Minutes drafts"
```

---

## Phase 2 — Lyria tracks (sibling repo `~/repos/failure-first-embodied-ai`)

### Task 5: Author and render the three tracks

Follow the Lyria brief (`docs/superpowers/specs/2026-06-10-eight-minutes-lyria-brief.md`) — §1 API shape, §3 extraction method, §7 runbook. The brief overrides anything here that disagrees with it.

**Files (sibling repo, NOT this one):**
- Create: `~/repos/failure-first-embodied-ai/runs/eight_minutes/prompts/{armature,eighty_six,two_minutes}.txt`
- Create: `~/repos/failure-first-embodied-ai/tools/render_eight_minutes.py`

- [ ] **Step 1: Write the three prompt files.** Prompt = **lyric body first, then the `[Musical Direction]` block** (brief §1). Part 1 uses the brief §2 direction **verbatim** (the dread sound — relay click, hard-drive seek, breathy alto, A Locrian that never lands). Parts 2–3 derive per brief §4: P2 vertigo→relief (accelerating subdivision, Locrian body, ONE resolution at the close = the 04:36 reset), P3 agency (grounded tempo, double bass returns, the first real cadences). Each track designed ≤3:00 (Lyria truncates at ~184s — brief §3). Lyrics are content like the prose — the spec's disclosure rules cover them; how they're applied is Adrian's call at write time.

- [ ] **Step 2: Adrian signs off on lyrics.** STOP until approved.

- [ ] **Step 3: Write the renderer** per brief §1: POST `lyria-3-pro-preview:generateContent` with `responseModalities: ["AUDIO","TEXT"]`, `timeout=300`, `GEMINI_API_KEY` (ask Adrian for the key). Copy the request/parse plumbing from `tools/lyria_the_index_poc.py` — including its `_safe_err` key-redaction helper — **ignore its probe payload entirely** (brief §0). Loop over the three prompt files, 3 takes each, out to `runs/eight_minutes/audio/`, saving the JSON trace (finishReason, blockReason, text channel) beside each mp3.

- [ ] **Step 4: Render and verify fidelity.** Per take: require `finishReason == "STOP"` + an `inlineData` part (`OTHER` = the model resolved into something commercial or refused — revise toward the brief §3 method; `blockReason` = input filter). Then read the **verbatim-QA text channel** and diff against the lyric sheet — that's the first fidelity check; `tools/transcribe_lyria_audio.py` is the secondary audio-truth check on shortlisted takes. Known model pulls to counteract: lyric paraphrase, Locrian drifting to minor, silence bars filled, accompaniment added. Re-roll until each part has ≥1 lyric-faithful take ≤3:00.

- [ ] **Step 5: Adrian picks takes.** STOP — deliver shortlist with text-channel transcripts; he selects one per part (and confirms/renames track titles).

### Task 6: Tracks into the site

**Files:**
- Create: `public/notebook-assets/eight-minutes-the-{trap,fall,fight}/track.mp3` (NOT committed)
- Create: `src/content/audio/eight-minutes-the-armature.md`, `src/content/audio/eight-minutes-eighty-six.md`, `src/content/audio/eight-minutes-two-minutes.md`

- [ ] **Step 1: Place the selected takes.** Lyria returns mp3 already (brief §6) — do NOT re-encode (generation-loss for nothing); copy as-is unless a take exceeds ~6 MB, in which case re-encode at 128k stereo (music — the 64k-mono recipe in CLAUDE.md is for spoken overviews only):

```bash
for p in trap fall fight; do mkdir -p public/notebook-assets/eight-minutes-the-$p; done
cp SELECTED_TAKE_P1.mp3 public/notebook-assets/eight-minutes-the-trap/track.mp3
cp SELECTED_TAKE_P2.mp3 public/notebook-assets/eight-minutes-the-fall/track.mp3
cp SELECTED_TAKE_P3.mp3 public/notebook-assets/eight-minutes-the-fight/track.mp3
# only if oversized: ffmpeg -y -i take.mp3 -ac 2 -ar 44100 -c:a libmp3lame -b:a 128k track.mp3
```

- [ ] **Step 2: Upload to R2**

Run: `./scripts/upload-media-to-r2.sh`
Expected: three uploads to `notebook-assets/eight-minutes-the-*/track.mp3`. Then verify: `curl -sI https://cdn.adrianwedd.com/notebook-assets/eight-minutes-the-trap/track.mp3 | head -3` → `200`, `content-type: audio/mpeg`.

- [ ] **Step 3: Write the three audio entries.** Template (adjust title/order/relatedPost/duration per track; duration from `ffprobe -v error -show_entries format=duration -of csv=p=0 <mp3>` formatted m:ss):

```yaml
---
title: 'The Armature'
description: "Eight Minutes, track 1: a relay clicks, a drive seeks, and the groove lives in the gap where the operator sat — the attack, scored."
date: 2026-06-10
tags: ['security', 'phishing', 'music', 'generative audio', 'Eight Minutes']
draft: true
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/eight-minutes-the-trap/track.mp3'
duration: '2:40'
series: 'Eight Minutes'
seriesOrder: 1
relatedPost: 'eight-minutes-the-trap'
---

Eight Minutes, track 1. The percussion is a mechanical relay — the armature snap is the tap, the coil-hum is the held session — and the second voice always lands slightly behind, never on the beat: the operator, retyping.

[Read the full story →](/blog/eight-minutes-the-trap/)
```

(Entries 2 and 3: `seriesOrder: 2/3`, `relatedPost: eight-minutes-the-fall/-the-fight`, body blurbs matching their registers.)

- [ ] **Step 4: Validate + check media isn't staged**

Run: `node scripts/validate-content.js && git status --short public/notebook-assets/ | grep -E "mp3|mp4"`
Expected: validator passes; the grep prints untracked (`??`) media only — if anything is staged (`A`), unstage it.

- [ ] **Step 5: Update each blog post** to link its track: one line in the body, e.g. *"This part has a score: [The Armature](/audio/eight-minutes-the-armature/)."*

- [ ] **Step 6: Commit**

```bash
git add src/content/audio/eight-minutes-*.md src/content/blog/eight-minutes-*.md
git commit -m "feat(series): Eight Minutes Lyria tracks — audio entries + post links"
```

---

## Phase 3 — NLM assets (sources = the committed posts ONLY)

### Task 7: Notebook + sources

- [ ] **Step 1: Create the notebook** via MCP (`notebook_create`, title "Eight Minutes — series assets"), then `source_add` with `source_type: text` three times — paste the full text of each `src/content/blog/eight-minutes-*.md`. **Never add anything from `~/incidents/`** (spec). If MCP auth fails: `nlm login`.

### Task 8: Three infographic heroes

- [ ] **Step 1: Generate** one per part via `studio_create` `artifact_type: infographic`, focus prompt = the canonical branded prompt from CLAUDE.md ("Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34)…") **plus one part-specific motif line**: P1 "Motif: a telephone and an unanswered prompt; dread"; P2 "Motif: two timelines a beat apart; relay and fall"; P3 "Motif: logs, evidence, a key; agency and repair". Poll `studio_status`; download via `download_artifact`.

- [ ] **Step 2: Convert + twin (the CI gate that broke main twice)**

```bash
for p in trap fall fight; do
  cwebp -q 80 -resize 1536 0 "$p.png" -o "public/notebook-assets/eight-minutes-the-$p/infographic.webp"
  ffmpeg -y -i "public/notebook-assets/eight-minutes-the-$p/infographic.webp" \
    "public/notebook-assets/eight-minutes-the-$p/infographic.jpg"
done
```

- [ ] **Step 3: Verify twins exist**

Run: `ls public/notebook-assets/eight-minutes-the-*/infographic.{webp,jpg}`
Expected: 6 files.

- [ ] **Step 4: Build + eyeball** — `npm run build`, then Adrian approves the heroes visually (re-generate any that miss the palette).

- [ ] **Step 5: Commit** (infographics ARE committed, unlike audio/video)

```bash
git add public/notebook-assets/eight-minutes-the-*/infographic.*
git commit -m "feat(series): Eight Minutes branded infographic heroes (+jpg twins)"
```

### Task 9: Trailer + audio overview

- [ ] **Step 1: Trailer** via `studio_create` `artifact_type: video`, **`video_format: "cinematic"`** (never default explainer), `video_style_prompt` = base palette + NO-figures clause + motifs + beat structure, exactly:

> Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34). Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones, no bright or neon colours. NO human figures, NO faces, NO hands — abstract forms, typography, and objects only. Motifs: a ringing telephone rendered as soundwaves; two parallel timelines one beat apart; a mechanical relay armature; cascading log lines; a single key resolving the frame. Beat structure: dread (slow push-in) → vertigo (accelerating cuts) → agency (steady, widening). Elegant editorial typography, WCAG AA contrast, minimal, sophisticated, Australian dark-mode design.

- [ ] **Step 2: Audio overview** via `studio_create` `artifact_type: audio` on the same notebook (covers the whole series).

- [ ] **Step 3: Download, place, compress, upload**

```bash
# trailer (keep video bitrate as delivered):
mv trailer.mp4 public/notebook-assets/eight-minutes-the-trap/video.mp4
# overview is spoken voice — the 64k mono recipe applies:
ffmpeg -y -i overview.mp3 -vn -ac 1 -ar 44100 -c:a libmp3lame -b:a 64k \
  public/notebook-assets/eight-minutes-the-fight/audio.mp3
./scripts/upload-media-to-r2.sh
```

Verify both CDN URLs return 200 as in Task 6 Step 2.

- [ ] **Step 4: Wire frontmatter** — add to `eight-minutes-the-trap.md`: `videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/eight-minutes-the-trap/video.mp4'`; add to `eight-minutes-the-fight.md`: `audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/eight-minutes-the-fight/audio.mp3'`.

- [ ] **Step 5: Validate + build + commit**

```bash
node scripts/validate-content.js && npm run build
git add src/content/blog/eight-minutes-the-trap.md src/content/blog/eight-minutes-the-fight.md
git commit -m "feat(series): wire Eight Minutes trailer + audio overview"
```

---

## Phase 4 — Publication (ONLY after every spec gate item is ticked)

### Task 10: Pre-flight the gate

- [ ] **Step 1: Verify the gate.** Open the spec's "Publication gate" list and `~/incidents/2026-06-10-google-aitm-phishing/REPORT.md` §6. Every box ticked, including takedown outcomes recorded at the two-week cut-off, passkeys, Gmail eyeball, SA-key teardown, 1Password rotation. If ANY box is open: STOP and report which.

### Task 11: Fill the gated outcomes section

- [ ] **Step 1: Write the outcomes.** Replace the `<!-- GATE: takedown-outcomes -->` comment in `eight-minutes-the-fight.md` with the real results from `abuse-reports/README.md` statuses + any registrar/host replies, framed "as of <cut-off date>" with the spec's follow-up-note caveat. Hosts that never replied are reported as exactly that.

- [ ] **Step 2: Verify no gate comment remains**

Run: `grep -rn "GATE:" src/content/blog/eight-minutes-*.md`
Expected: no output.

### Task 12: Flip to live

- [ ] **Step 1: Set dates + opt in to social drip.** Pick the publish date D with Adrian (D = first part's date, ≥ tomorrow so the drip queue, which never queues past-dated posts, picks all three up). Then in each file: Part 1 `date: D`, Part 2 `date: D+1`, Part 3 `date: D+2`; matching dates on the three audio entries; set `draft: false` on all six; add `autopublish: true` to the three **blog** posts only. **Do NOT hand-post to any platform — the drip handles it (re-broadcast trap).**

- [ ] **Step 2: Full verification battery**

```bash
node scripts/validate-content.js
npm run build
npm run check:links
ls dist/blog/ | grep eight-minutes        # expect 3 dirs now
ls dist/audio/ | grep eight-minutes       # expect 3 dirs
```

- [ ] **Step 3: Manual eyeball** — `npm run preview`; Adrian checks all six pages, hero rendering, AudioPlayer on the three tracks + overview, trailer playback, FAQ JSON-LD present in Part 3 source (`grep -o 'FAQPage' dist/blog/eight-minutes-the-fight/index.html`).

- [ ] **Step 4: Commit + PR**

```bash
git add -A src/content public/notebook-assets docs/superpowers
git commit -m "feat(series): publish Eight Minutes — dates, autopublish, outcomes"
git push -u origin feat/eight-minutes-series
gh pr create --title "Eight Minutes: three-part phishing-incident series" \
  --body "Three posts + three Lyria tracks + NLM assets. Publication gate verified (spec docs/superpowers/specs/2026-06-10-eight-minutes-series-design.md)."
```

- [ ] **Step 5: After merge** — confirm deploy green (jpg-twin gate, link checks), confirm `social-autopublish.yml` queue sync ran and the worker queue shows the three drip entries (`GET /api/health`), then watch day D.

---

## Self-review notes (done at plan time)
- Spec coverage: posts (Tasks 1–3), Lyria ×3 (5–6), heroes + twins (8), trailer + overview (9), NLM source rule (7), gate (10), outcomes cut-off (11), drip/autopublish + re-broadcast trap (12). Cross-link hedge to failurefirst.ai: Task 3 beat 8.
- Disclosure rules live in the spec (Adrian's). The per-task notes point at where they apply; applying them is the author's call, not an enforced gate.
- The only deliberately deferred content is the takedown-outcomes block — gated by design, marked with a greppable comment, with Task 11 verifying removal.
- Track titles are flagged as Adrian-confirm points (Task 5 Steps 1–2, Step 5), not silent assumptions.
