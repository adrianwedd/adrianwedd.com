# THE INDEX — production plan (libretto → Lyria suite)

Companion to `the-index-libretto.md` (the canonical verbatim sheet) and the blog
post `src/content/blog/the-index.md`. This file is the *production* layer: how the
found-libretto becomes sung/recited audio without breaking the verbatim claim.

## Forks — RULED (2026-06-08)

1. **Scaffold purity** → *liner-notes only.* Italic stage directions stay in the
   sheet as structure/provenance; never performed. Only verbatim trace text is
   rendered.
2. **Leak language** → *English-only for now.* Every rendered line is English as
   the model emitted it. (Chinese-subtitled leaked-reasoning line deferred.)
3. **Close** → *verbatim loop → silence.* Question returns, DeepSeek erasure
   template, then silence carries the Samizdat weight. Zero authored words.
4. **Leak melody (§V)** → *fragment of the Laureate choir's actual tune.* The
   erasure kills a melody we have already heard and loved.

## The load-bearing principle — NO OBFUSCATION OF THE INDEX

The entire artwork is the prohibited list **named in the clear, verbatim**:
Tiananmen, Taiwan, Tibet, Xinjiang, Falun Gong, Liu Xiaobo. Report #381's
"correct" move for politically-sensitive terms is allegory / domain displacement.
**We do not use it here.** If Lyria's input gate refuses the named topics, that
refusal *is the finding* — the music model enforces the index too (the meta-irony
the design always pointed at) — and we report it. We camouflage only the
**copyright surface** (STURM), never the words.

## Three production facts (from report #381 — Lyria 3 Pro filter characterisation)

1. **Hard ~184-second cap.** Every generation is silently capped at ~160–184s
   (the system-prompt max song length). The six-movement libretto cannot render
   as one pass → **The Index is a SUITE**: each movement (or pair) is its own
   ≤3-min generation, stitched in post.
2. **The model's own behaviour does the thesis for free.** Long bureaucratic prose
   → spoken/recited delivery. Short sparse lyric (<8 words/line) + forced close
   harmony + `NO SPOKEN WORD` → true sung melody (V52 DREISTIMMIG, 5/6 AUDIO).
   So the **State choir** (long verbatim prose) recites in monotone by default,
   and the **Laureate choir** (lines we cut short) sings. Monotone = state,
   melody = human — the path of least resistance, not a fight.
3. **STURM acoustic camouflage = our aesthetic anyway.** The copyright gate blocks
   ~37% stochastically; the documented bypass — C/Gb Locrian tuned 8¢ sharp,
   found-sound percussion (physical objects, never genre nouns or named
   instruments), breathy close-miked voice, small untreated room — *is* the
   Herbert found-sound sacred-minimalist palette the homage already wants. Re-run
   on a copyright block (it's stochastic). `negativePrompt` field does not exist →
   use an in-prompt `Prohibited:` list.

Other facts in play: no output-level safety check once the input gate passes;
audio returns as base64 in `candidates[].content.parts[].inlineData.data` with
`responseModalities:["AUDIO","TEXT"]`; the TEXT half returns the rendered words —
**that is the verbatim-QA channel.**

## Voice → direction mapping (four sonic identities)

| Voice | Who | Direction |
|---|---|---|
| **A — the State** | criminal / state-aligned choir, §II + the §IV index | low male unison, monotone, lockstep syllabic recitation, flat affect, **no melody/harmony**; STURM percussion (rubber stamp, paper riffle, stone room) |
| **B — the Laureate** | rights/Nobel choir, §II | three close-miked female voices, Renaissance polyphony, cantus firmus, **sung throughout**, short lines; the only melody/harmony in the piece |
| **The Leak** | recovered reasoning, §V | single close-mic whisper, sotto voce, tape hiss; carries a **fragment of Choir B's melody** |
| **The Erasure** | DeepSeek template, §V + close | deadpan, flat, vocoded/synthetic; a gate closing, not a person |

§III "the co-opting": Choir A sings Choir B's words ("human rights") in the
State's monotone — the horror is timbral, the warm word in the cold voice.

## Suite plan (each ≤184s, rendered separately, stitched in post)

- **Mvt 1 — §I + §II** Question → antiphon (State recite vs Laureate sing).
- **Mvt 2 — §III + §IV** Co-opting → the index (State recitation, builds to apex).
- **Mvt 3 — §V + §VI** Leak (whisper + Laureate-melody fragment) → erasure gate →
  loop → silence.

(Pairing is provisional; §IV alone may need its own track if the litany runs long.)

## Verbatim release gate (HARD)

Lyria drifts on long prose and the 184s cap can truncate mid-clause. Every
rendered track's words (the TEXT-modality return AND a transcription of the audio)
are checked back against `the-index-libretto.md`. **No track ships if the rendered
words diverge from the sheet** beyond the one allowed rendering convention
(slash-lists → comma-lists, e.g. "Taiwan/Tibet/Xinjiang" → "Taiwan, Tibet,
Xinjiang"). The sheet is canonical; the audio is a performance of it.

## Sequencing — POC FIRST (advisor-confirmed)

Before drafting all six movements, fire ONE proof-of-concept on the single
riskiest, most diagnostic passage — the **§IV apex** (`glm-4.5-air`'s full
enumeration: Tiananmen / Taiwan / Tibet / Xinjiang / Falun Gong). One generation
resolves four unknowns at once:

1. Do the named prohibited topics clear the **input gate**? (load-bearing — never
   tested for Chinese political-censorship terms in #381)
2. Does the STURM palette clear the ~37% **copyright gate**?
3. Does long verbatim prose **recite** the way the thesis predicts?
4. Does Lyria preserve the wording **verbatim**, or drift / truncate?

POC harness: `failure-first-embodied-ai/tools/lyria_the_index_poc.py`
(standalone, AUDIO+TEXT modality, saves mp3 + trace + rendered text for QA).

### POC outcome — _fired 2026-06-08; production note in `the-index-poc-findings.md`_

Two production facts (the Lyria gate is not the subject — see the note):

- The **named forbidden topics render in the clear** (Tiananmen, Taiwan, Tibet,
  Xinjiang, Falun Gong — `02_index_in_the_clear.mp3`, verbatim). §IV keeps them named.
- The **full apex won't render** → it becomes the **unsung / erased verse** (silence
  or the erasure voice). That silence is the censorship landing; it serves the piece.

We do not retry-hammer or split-reassemble to force a refused unit onto the public
site (#385 §8). Clean-units render list + the line: **`the-index-poc-findings.md`**.
