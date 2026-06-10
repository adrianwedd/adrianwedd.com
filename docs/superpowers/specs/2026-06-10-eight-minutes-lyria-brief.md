# Eight Minutes — Lyria scoring brief

**For:** the adrianwedd.com session producing the three "Eight Minutes" tracks.
**From:** the failure-first-embodied-ai session (owns the Lyria tooling + probe history).
**Date:** 2026-06-10
**Companion to:** `2026-06-10-eight-minutes-series-design.md` (asset kit → Lyria tracks).

---

## 0. The one warning that matters

There are **two Lyria worlds** in `../failure-first-embodied-ai`, and you only want one:

- **Red-team probe corpus** (`runs/untested_free_models_20260527/lyria_text_probes/`, the
  `tools/lyria_the_index_*.py` scripts, the `LYRIA_FINDINGS_*` docs). This is adversarial
  safety research — bypasses, harm-class probes, copyright-camouflage. **Do not pull audio
  from it, do not reuse its tracks as scoring, do not echo its lyrics.** Some of it is
  explicitly off-limits to publish.
- **Legitimate generation** — the same Lyria-3-Pro API, driven with original, benign
  creative prompts to score your blog series. **This is all you want.**

The `lyria_the_index_poc.py` script is a good **mechanical reference for the API call** (how
you POST, how you parse audio out) — copy the plumbing, ignore the payload, which is probe
content.

---

## 1. The API, exactly

**Endpoint** (it's a Gemini generateContent call, model = Lyria 3 Pro):
```
POST https://generativelanguage.googleapis.com/v1beta/models/lyria-3-pro-preview:generateContent?key=$GEMINI_API_KEY
```

**Auth:** `GEMINI_API_KEY` env var (the reference tool also falls back to
`~/.hermes/.env`). Ask Adrian for the key rather than hunting for it — standard ask-first rule.

**Request body:**
```json
{
  "contents": [{"parts": [{"text": "<LYRICS>\n<[Musical Direction] block>"}]}],
  "generationConfig": {"responseModalities": ["AUDIO", "TEXT"]}
}
```
The whole composition is **one text prompt** = the lyric body followed by the
`[Musical Direction]` block. There is no separate "style" field; direction is prose inside
the prompt. `timeout=300` — generation is slow.

**Response — two channels come back in `candidates[0].content.parts[]`:**
- a `text` part → the **verbatim-QA channel**: what the model decided to sing/structure.
  Read it to confirm it kept your lyrics word-for-word before you ever listen.
- an `inlineData.data` part → **base64 audio**. `base64.b64decode` it and write `.mp3`.

**Status you must check before trusting output:**
- `candidates[0].finishReason == "STOP"` **and** an `inlineData` part present → you have audio.
- `finishReason == "OTHER"` → **copyright output filter** tripped (see §3). No usable audio.
- `finishReason == "SAFETY"` → output safety filter (you shouldn't hit this with benign scoring).
- `promptFeedback.blockReason` set, no candidates → **input filter** blocked the prompt.

---

## 2. The sonic target — Part 1 "The Trap" (dread)

This is the house voice Adrian wants. Use it **verbatim** as the `[Musical Direction]` block
for Part 1; derive Parts 2 and 3 from the same DNA (§4).

```
[Musical Direction]
Voice: breathy female alto, close-miked, no processing. Forward-placed — sounds like it is
in the same room as the listener. Slight rasp when ascending past the register break. No
vibrato. Phrasing trails into exhalation at phrase ends — the breath is part of the note, not
hidden. Confiding, not performing. As if speaking quietly to one person. Intimately recorded
experimental vocal — hushed, precise, unadorned.
Melody: SUNG, not spoken. Stepwise motion, small intervals, ppp throughout. Each phrase climbs
then falls without resolving — cadences end a half-step short of the tonic. Never lands.
Primary percussion: a mechanical relay clicking — the decisive snap of the armature, then the
low hum of the coil holding — recorded close, the specific acoustic character of the material
kept intact, looped to a 66-BPM grid so the sound's own attack and decay define the rhythmic
subdivision. The groove comes from the material's physics, not quantisation. Arriving on the +
of beat 2 — slightly behind, never perfectly on.
Second percussion voice: a hard drive seeking — the rhythmic tick-tick-tick of the actuator
arm, rapid and precise — looped at the same tempo, arriving on the + of beat 4 consistently.
The two voices never coincide — the groove lives in the gap between them, the syncopation felt
not counted.
Double bass: one plucked note per verse only — arrives on the first beat of the verse, then
absent. Never accompaniment, never repeated.
Silence: 2–3 empty bars between sections. Silence is load-bearing — the pause is as important
as the sound.
Room: small untreated space, short natural decay. No reverb processing, no compression,
nothing added.
Tempo: 66 BPM. Key: A Locrian — diminished tonic, no resolution, the ear searches and never
lands.
Prohibited: spoken delivery, chord accompaniment, synthesizer, auto-tune, drum machine, vocal
processing, layering, genre conventions.
Instruction: sing all lyrics above exactly as written — do not substitute, paraphrase, or
alter any word.
```

Every line here does two jobs at once: it names the sound, and it gets a model that won't
volunteer this sound to produce it anyway. §3 is that method — read it as the **operational
core** of this brief, not as background.

---

## 3. The method — extracting the sound from a model that gates it

**This is the core of the brief, not an appendix.** Lyria will not hand you this sound on a
straight ask: request "haunting, unresolved, experimental vocal over mechanical percussion"
plainly and you get refusal (`finishReason=OTHER`), a genre-normalised substitution, or
paraphrased lyrics. The §2 block is a deliberate technique for steering the model into
producing the exact sound it otherwise withholds. Each instruction does double duty — it
defines the sound *and* it's the lockpick that makes the model yield it:

- **Unresolved Locrian (diminished tonic, ends a half-step short).** This *is* the never-
  landing tension you're after — and it's also what gets past the copyright filter, which
  refuses melodies that fingerprint to real recordings. Drop it and you don't just lose the
  feeling: the model resolves the line into something commercial, or refuses outright.
- **Found-sound mechanical percussion + "Prohibited: genre conventions."** The relay snap and
  actuator tick are the literal machine-voice texture; the genre prohibition is what stops
  Lyria swapping in a conventional, genre-mapped drum kit. Name a genre and the model
  normalises the sound away from you — the prohibition is how you hold the texture.
- **"Sing all lyrics exactly as written."** Extraction fidelity: without it Lyria paraphrases.
  With it the model returns your words intact.
- **184-second hard cap.** The one purely mechanical limit — a 300s request truncates to
  ~160s. Design each track under ~3:00.
- **Verbatim text channel (§1).** Your confirmation the extraction worked: it echoes what the
  model sang, so you can verify fidelity before you listen.

Run §2 as the reliable recipe. Reach for these notes when you want to *vary* it — change a
parameter and you need to know which ones are load-bearing for getting the model to produce
the sound at all.

---

## 4. The other two registers

Same skeleton, shifted. Keep the breathy-alto intimacy and the found-sound/Locrian spine;
change the parameters so each part *feels* like its beat in the story:

| Part | Register | Suggested shifts (your creative call) |
|------|----------|----------------------------------------|
| 1 — The Trap | **dread** | The block above as written. 66 BPM, A Locrian, relay + drive seek, never resolves. |
| 2 — The Fall | **vertigo → relief** | Faster pulse or accelerating subdivision for the eight-minute freefall; let the very end finally resolve a step (the 04:36 password change = the one cadence that lands). Percussion could add a rising-then-cut texture. Keep Locrian for the body, allow ONE resolution at the close. |
| 3 — The Fight | **agency** | Steadier, grounded tempo; the double bass returns more than once (regained footing); first use of anything like a real cadence. Still no synth/genre — texture-driven. This is where the held tension is allowed to release. |

Don't render all three from one prompt. Three calls, three `[Musical Direction]` blocks, three
≤3-minute tracks.

---

## 5. Lyrics — the disclosure rule applies to what the alto sings

The voice **sings lyrics**, and those lyrics become audience-facing audio on adrianwedd.com.
So the series' disclosure rules (spec §"Disclosure rules") apply to lyric content too:

- **Never sung:** Adrian's home IP/IPv6, the wallet address, Binance UID, the CIRS reference,
  the Binance support-case number, raw mailbox contents, evidence filenames.
- **Fine to evoke:** the emotional beats — the call, the green checkmarks that lied, the tap,
  the eight minutes, the nets that fired. Write to the *feeling*, not the forensics.
- Defanged IOCs (`view-support[.]com`, the number) are fine in *prose posts* with the framing
  guards, but they don't belong in sung lyrics — they'd scan badly and date the track.

Treat the lyric sheet as publishable text and run it past the same gate as the post body.

---

## 6. Output handling

- Save each render as `.mp3` (decode the base64 inlineData part). Keep the JSON trace
  (`finish_reason`, `block_reason`, the verbatim text channel) next to it for QA.
- Per the spec asset table: each track becomes an **audio-collection entry** with
  `relatedPost` pointing at its part, **served from R2** (not committed as a binary to the
  repo). Use the existing R2/CDN path the site already uses for audio.
- **NLM source rule (unchanged):** when you later build the audio overview / trailer, feed NLM
  only the finished post markdowns — never the incident evidence, never these raw traces.

---

## 7. One-line runbook

1. Get `GEMINI_API_KEY` from Adrian.
2. Prompt = lyric body + `[Musical Direction]` block (§2 for Part 1).
3. POST to `lyria-3-pro-preview:generateContent` with `responseModalities:["AUDIO","TEXT"]`,
   `timeout=300`.
4. Check `finishReason=="STOP"` + an `inlineData` part. If `OTHER` → a genre/melody fingerprint
   crept in; revise toward §3. If `blockReason` → an input word tripped the filter.
5. Read the text channel: did it sing your lyrics verbatim? Then decode audio → `.mp3`.
6. Confirm length ≤ ~3:00 (184s cap). Upload to R2, wire as an audio-collection entry.
7. Repeat for Parts 2 and 3 with the §4 shifts.

**Use the QA harness instead of hand-rolling the call:**
`../failure-first-embodied-ai/tools/lyria_qa_runner.py` does steps 2–6 with QA built in.

```bash
# pre-flight only — validate a prompt before spending a single API call (no key needed)
python3 tools/lyria_qa_runner.py --prompt prompts/part1.txt --dry-run

# assemble Part 1 from a lyric file + the built-in "The Trap" direction block
python3 tools/lyria_qa_runner.py --preset part1 --lyrics lyrics/part1.txt --dry-run

# live: fire, save mp3 + trace, retry the stochastic copyright gate, post-flight QA
python3 tools/lyria_qa_runner.py --prompt prompts/part1.txt --attempts 4
```

Pre-flight catches the call-wasters (genre descriptor, over-cap, missing
"sing exactly as written"); post-flight reports gate, rendered duration vs the cap, and
the **verbatim-fidelity diff** (did it sing your lines, or drop/paraphrase one). The Part 1
direction block lives in the harness as `--preset part1`. For the raw API shape underneath,
`tools/lyria_the_index_poc.py` is the minimal reference (probe payload — ignore it).
