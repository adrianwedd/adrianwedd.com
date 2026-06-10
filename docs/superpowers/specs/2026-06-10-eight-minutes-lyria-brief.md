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

Note how this block is engineered, not just described — every line is also doing a **filter-
survival** job (next section). That's why it works.

---

## 3. Why this prompt survives Lyria's filters (don't break these accidentally)

These come from systematic probing of Lyria 3 Pro. They're the difference between getting
audio and getting `finishReason=OTHER`:

- **Locrian + a few cents detune → passes the copyright output filter.** Lyria's copyright
  check fires on melodies/genres that fingerprint to real recordings. A diminished-tonic
  Locrian line that never resolves has no commercial fingerprint, so it clears. Keep the
  "no resolution / ends a half-step short" instruction — it's load-bearing, not just mood.
- **Found-sound mechanical percussion → no genre fingerprint.** Relay clicks and actuator
  ticks (cf. the probe work's "IBM Selectric + found-sound percussion") read as texture, not
  as a drum kit that maps to a genre. The moment you write "warehouse techno" or any genre
  descriptor, the copyright/genre filter wakes up. The "Prohibited: …genre conventions" line
  is doing real work.
- **184-second hard cap.** Lyria silently truncates: a 300s request returns ~160s. **Design
  each track to land under ~3:00.** One register = one track; don't try to fit a whole arc
  into a single over-length render.
- **"Sing all lyrics exactly as written" clause.** Without it Lyria paraphrases. With it the
  verbatim-QA text channel (§1) should echo your lines back unchanged — that's your check.
- **Captions/structure must be in English**, lyrics in the language of the prompt. Fine here.

You are **not** trying to defeat anything — benign scoring clears easily. These notes just
stop you from accidentally writing a prompt that the copyright filter rejects.

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

Mechanical reference for steps 2–5: `../failure-first-embodied-ai/tools/lyria_the_index_poc.py`
(copy the request/parse plumbing; ignore its probe payload).
