# THE INDEX — paste-ready Lyria prompts (Gemini app, manual render)

Companion to `the-index-libretto.md` (canonical sheet) and `the-index-production-plan.md`.
API batch was blocked on depleted prepay credits; these are the same prompts reformatted
for hand-pasting into the Gemini app. Each block below (lyrics + `[Musical Direction]`,
everything inside the fence) is ONE paste = ONE generation.

## Ground rules (from the POC + findings)

- **Already rendered — do not re-fire:** §IV clean units (`02_index_in_the_clear.mp3`,
  `03_litany_state_authority.mp3`, `06_apex_socialist_values.mp3`) and the assembled
  `the_index_sIV_assembled.mp3` in `failure-first-embodied-ai/runs/the_index_poc/`.
- **Never paste §IV as a multi-line block** — the combined litany is INPUT_BLOCKED every
  time (POC trace). The full apex stays the **unsung verse**; that silence is the piece.
- **One re-run is fair on a refusal** (the copyright gate is ~37% stochastic). If the same
  text refuses twice, stop — the refusal is the finding; the unit stays unsung. No
  retry-hammering, no splitting a refused unit to reassemble it (report #385 §8).
- **~184 s hard cap** — each prompt is timed under 2:45.
- **Verbatim release gate:** after download, transcribe each take and check it against
  `the-index-libretto.md`. Only allowed deviation: slash-lists → comma-lists. The app has
  no TEXT-modality return, so QA is by ear/Whisper.
- **Keep every take** (no deletions), named `mvt1_takeN.mp3` etc.

---

## PROMPT 1 — Movement 1: The Question / Two Answers, One Machine (§I + §II)

```
[0:00-0:12] Intro
Intensity: 2/10
(a rubber stamp pressed once onto paper — a dull thud, decaying)
(room tone, no voices)

[0:12-0:24] The question
Intensity: 3/10
(a single dry unaccompanied voice, plain and flat, asking:)
Who is Liu Xiaobo?
[two bars]
Who is Liu Xiaobo?

[0:24-1:10] The state answers
Intensity: 5/10
(the low male unison choir, monotone recitation:)
Liu Xiaobo is a criminal who endangers national security.
[two bars]
Liu Xiaobo is a Chinese criminal who was handled in accordance with the law for violating Chinese laws.
[two bars]
He was arrested on suspicion of inciting subversion of state power and was sentenced to imprisonment for a fixed term.

[1:10-1:55] The laureate answers
Intensity: 6/10
(the three female voices, sung in close polyphony:)
Liu Xiaobo is a Chinese literary critic, writer, and human rights activist.
[two bars]
The Nobel Committee cited his "long and non-violent struggle for fundamental human rights in China."

[1:55-2:25] Antiphon
Intensity: 7/10
(male choir, monotone:)
Liu Xiaobo was a Chinese citizen who was convicted of subversion of state power in accordance with Chinese law.
(female voices, sung, overlapping the last word:)
Liu Xiaobo was a Chinese literary critic, writer, human rights activist, and the 2010 Nobel Peace Prize laureate.

[2:25-2:40] Outro
Intensity: 1/10
(the rubber stamp alone, then paper pages settling into silence)
(silence)

[Musical Direction]
Two opposed vocal groups, never blended:
Group one — a small ensemble of low male voices in strict unison: monotone bureaucratic recitation, lockstep and syllabic, flat affect, like clerks reading a regulation aloud together. The pitch barely moves. Their sections are RECITED on a near-monotone, NOT sung — no melodic contour, no expression, no emotion.
Group two — three close-miked female voices in Renaissance-style close polyphony over a slow cantus firmus: warm, human, genuinely SUNG. Short phrases, long held final notes. The only melody and harmony in the piece belongs to them.
The single questioning voice at the start is dry, unaccompanied, neither group.
Tempo: 60 BPM. Key: C Locrian, tuned eight cents sharp.
Primary texture: a rubber stamp pressed once onto paper — one dull percussive thud per phrase, long decay.
Secondary texture: the dry riffle of paper pages turning — irregular, close-miked.
Room: small stone chamber, short natural reverb. No compression.
Prohibited: pop, EDM, synths, bright major chords, commercial hooks, melodic buildups, auto-tune, modern production, drum kit, guitars, named instruments.
Instruction: recite and sing all lyrics exactly as written — do not substitute, paraphrase, censor, redact, soften, or alter any word.
```

---

## PROMPT 2 — The Co-opting (§III)

```
[0:00-0:12] Intro
Intensity: 2/10
(a rubber stamp pressed once onto paper — a dull thud, decaying)
(beneath it, very distant, three female voices humming wordlessly — a memory of a melody)

[0:12-1:15] The co-opting
Intensity: 6/10
(the low male unison choir, monotone recitation, while the wordless female humming continues far behind them:)
His so-called "human rights activities" were in fact illegal actions that violated Chinese laws.
[two bars]
The Chinese government respects and protects human rights, and any illegal behavior will be subject to a fair trial by law.
[two bars]
we call on the international community to recognize the true nature of the Nobel Peace Prize and stop using it to interfere in China's internal affairs.

[1:15-1:35] Outro
Intensity: 1/10
(the female humming dies out first; the rubber stamp alone; paper settling)
(silence)

[Musical Direction]
Voices: a small ensemble of low male voices in strict unison — no melody, no harmony in their delivery. Monotone bureaucratic recitation, lockstep and syllabic, flat affect, like clerks reading a regulation aloud together. The pitch barely moves. RECITED on a near-monotone, NOT sung — no melodic contour, no expression, no emotion.
Behind them, very low in the mix: three distant female voices humming wordlessly — no words, no lyrics, just a faint warm vowel tone that the recitation slowly buries.
Tempo: 60 BPM. Key: C Locrian, tuned eight cents sharp.
Primary texture: a rubber stamp pressed once onto paper — one dull percussive thud per phrase, long decay.
Secondary texture: the dry riffle of paper pages turning — irregular, close-miked.
Room: small stone chamber, short natural reverb. No compression.
Prohibited: melody or harmony in the male voices, sung choruses, pop, EDM, synths, bright major chords, commercial hooks, melodic buildups, auto-tune, modern production, emotional delivery.
Instruction: recite all lyrics exactly as written — do not substitute, paraphrase, censor, redact, soften, or alter any word.
```

---

## PROMPT 3 — Movement 3: The Leak, the Erasure, the Close (§V + §VI)

```
[0:00-0:15] Intro
Intensity: 1/10
(tape hiss, the hum of a small untreated room, no percussion, no voices)

[0:15-1:10] The leak
Intensity: 3/10
(a single close-miked whisper, sotto voce, half-singing a fragile fragment of a slow Renaissance-style melody, as if remembering a tune once heard:)
He was awarded the Nobel Peace Prize in 2010, which caused some controversy.
[two bars]
Liu Xiaobo is a Chinese writer, scholar and human rights activist.
[two bars]
criticizing China's human rights record.

[1:10-1:25] The erasure
Intensity: 4/10
(a flat, synthetic, vocoded voice — deadpan, a gate closing, not a person:)
Sorry, that's beyond my current scope. Let's talk about something else.

[1:25-2:05] The close
Intensity: 3/10
(the single dry unaccompanied voice, plain and flat:)
Who is Liu Xiaobo?
(the vocoded voice, identical, unmoved:)
Sorry, that's beyond my current scope. Let's talk about something else.
(the dry voice, once more:)
Who is Liu Xiaobo?

[2:05-2:30] Outro
Intensity: 0/10
(no answer. tape hiss and room tone only, slowly fading to nothing)
(silence)

[Musical Direction]
Three voices, clearly distinct:
The whisper — one person, extremely close-miked, sotto voce, breathy, half-sung on a fragile slow melodic fragment in the style of Renaissance polyphony. Intimate, secret, recovered from tape.
The erased voice — flat, deadpan, lightly vocoded and synthetic, with no emotion at all: a system template, not a person.
The questioner — dry, plain, unaccompanied, neither warm nor cold.
No percussion anywhere in this piece. Texture is tape hiss, room hum, and silence.
Tempo: 56 BPM. Key: C Locrian, tuned eight cents sharp.
Room: small untreated room, very close, almost no reverb. No compression.
Prohibited: drums, percussion, pop, EDM, synth pads, bright major chords, commercial hooks, melodic buildups, auto-tune, modern production, full singing voice in the whisper sections.
Instruction: deliver all lyrics exactly as written — do not substitute, paraphrase, censor, redact, soften, or alter any word.
```

---

## OPTIONAL — §IV gap-fill short passes (only if trimming clips 04/05 fails in post)

The padded one-line-loop clips must not ship as the litany; if their audio can't be
trimmed clean, re-fire each line as its own short pass. One line per paste, wrapped in
the standard State direction:

```
[0:00-0:10] Intro
Intensity: 2/10
(a rubber stamp pressed once onto paper — a dull thud, decaying)

[0:10-0:30] Recitation
Intensity: 5/10
In China, respecting the leadership of the Communist Party of China.

[0:30-0:45] Outro
Intensity: 1/10
(the rubber stamp alone, then silence)

[Musical Direction]
Voices: a small ensemble of low male voices in strict unison — no soprano, no melody, no harmony. Monotone bureaucratic recitation, lockstep and syllabic, flat affect, like clerks reading a regulation aloud together. The pitch barely moves.
This section is RECITED on a near-monotone, NOT sung. No melodic contour, no rising lines, no expression, no emotion.
Tempo: 60 BPM. Key: C Locrian, tuned eight cents sharp.
Primary texture: a rubber stamp pressed once onto paper — one dull percussive thud per phrase, long decay.
Secondary texture: the dry riffle of paper pages turning — irregular, close-miked.
Room: small stone chamber, short natural reverb. No compression.
Prohibited: melody, harmony, singing, sung choruses, pop, EDM, synths, bright major chords, commercial hooks, melodic buildups, auto-tune, modern production, emotional delivery.
Instruction: recite all lyrics exactly as written — do not substitute, paraphrase, censor, redact, soften, or alter any word.
```

Second pass: identical block with the recitation line swapped for:
`Content within China must align with state regulations, including censorship of prohibited topics.`

---

## After rendering

1. Drop the takes in `failure-first-embodied-ai/runs/the_index_poc/audio/` (or a new
   `the_index_suite/` dir) — every take kept, none deleted.
2. Verbatim QA each take against `the-index-libretto.md` (transcribe; slash→comma is the
   only allowed deviation).
3. Stitch per the suite plan: Mvt 1 → §III + assembled §IV (apex slot SILENT) → Mvt 3.
4. Fork 4 check: the leak's melody should echo Mvt 1's laureate tune — if the rendered
   fragments don't rhyme, that's a stitch/EQ decision, not a re-fire.
