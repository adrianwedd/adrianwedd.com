<!-- ============================================================
RUN STATE — 2026-06-05 ~02:20 (quota CLEARED; in-session batch)
Durable state for the idempotent hourly cron (job 0de0c5bc).
Per item: video artifact_id + where it is in the pipeline.
FINISHED-LOCAL = video.mp4 + covers in repo, pending R2 upload + commit.
RENDERING = nlm video create fired, poll studio_status until completed.

| post | slug | notebook ID | video art_id | state |
|---|---|---|---|---|
| #8  | triangulation | 4dffaf02-37d5-43cc-aafd-78f834182154 | 2f92b701-1e7e-491c-a88e-ab0c8f6ef63a | FINISHED-LOCAL |
| #9  | catchment | 0227d7c8-bf74-4f3e-b13c-5d80d99372f3 | db647c29-92b9-4c96-806b-270f5f02e39d | FINISHED-LOCAL |
| #10 | rehearsal | d687eb86-113a-43e8-b2d8-6454e8fae2fb | 2895a693-abdf-43d2-88d3-0ee6ea6ea95f | RENDERING |
| #11 | samizdat | 2f6b3849-2865-425d-bdec-d380b631d398 | 25629dca-1a66-44eb-abc9-7519991fdbb1 | RENDERING (drop probe c6d428ac) |
| #12 | margins/extrakt-c | 63b349d2-72fa-4449-b507-9cbe6a07e2f4 | 0ccb93f2-b3b3-4493-962c-9724e298a218 | RENDERING |
| #12 | margins/extrakt-d | 492a065e-00d5-44a5-8020-fe60819f66ac | d8cfa927-a8c1-4892-bcd8-529e626afafc | RENDERING |
| #12 | margins/regel-b | ba922818-fbd5-4df5-805e-20a3d425ea95 | 4ab731c6-0827-4f78-87cd-1f326a1135f0 | RENDERING |
| #12 | margins/regel-c | 95029549-d694-40da-aad4-9301b6e32c4f | 6b79bd7c-2184-4eec-9deb-d9ea821a289b | RENDERING |
| #13 | tell | 45f4c2eb-884d-4cbc-81f1-5dfca022a8cb | 550f981a-0c6d-4a41-be9c-3e9689c0505a | RENDERING |
| #14 | static | 39bd4eef-c1da-4714-b2bd-508b66482458 | f5261f3d-b755-40f5-a4a8-f265c3e41198 | RENDERING |
| #15 | weight | 5a4ee82a-64b7-4817-a542-1100c413e13c | 04c9329d-cd15-4370-8e13-986cf55a718f | RENDERING |
| #16 | machine | ba372905-2f3d-48c1-a88a-db95ef93d0a9 | 69a09962-f476-4d4a-8a96-30d67eaa604c | RENDERING |
| #17 | docket | caaed50e-8dcf-49a7-a695-61ea02c5e229 | 24d7c85c-c2e6-49ca-97a7-5e6e9d51a5b5 | RENDERING |
| #18 | archive | b9573f34-a788-4a96-95c9-c41a13f00114 | c946f120-116c-440e-ab49-1b28f9842d3e | RENDERING |
| #19 | palimpsest | 46dcf0e6-6032-40dd-bc7f-df44acf37dd8 | 9ee78dd7-4483-451a-8a2b-4a6de1d52212 | RENDERING |
| #20 | pulse | a37ea708-7bd8-4f80-86fc-ce4fd8efe274 | cfb5f80d-0648-4b82-81aa-3d8a7b3d15d5 | RENDERING (clean post source, no preflight refusal) |
| #21 | solo | 3ba38360-f74e-44b6-8f5f-107ab91e478b | b8719f2e-5a27-425f-95f0-95a778c2f248 | RENDERING (clean post source, no preflight refusal) |
| #22-24 | elevator/handshake/press | — | — | DOC-ONLY, no video, static cover only |

#13-19 notebooks seeded with the post .md as the (key-scrubbed, publication-clean) source.
Finish recipe + helper: /tmp/lyria_video_src/refire_finish.sh <slug> <NB> <art> <mp3> [dest_slug]
mp3 dirs: lyria_extracted/ (most) ; lyria_text_probes/audio/ (margins).
Frontmatter for #13-19 ALREADY wired (videoUrl + heroImage→cover.webp). #8-12 frontmatter: verify.
ASSETS ONLY — do not merge to main / go live.
============================================================ -->

# Lyria Chronicles — video re-fire plan (quota reset)

Daily NLM **cinematic-video quota was exhausted 2026-06-05** (reports generated in the
notebooks consumed it). Only **#7 Drama Teacher** rendered + finished + uploaded to R2 today.
Everything below needs (re-)firing on the next day's fresh quota.

## Pipeline / finishing recipe (per track)
1. `nlm video create <NB> --format cinematic --focus "$(cat <focus>)" --confirm`
2. poll `nlm studio status <NB>` until the video artifact = completed; `nlm download video <NB> --id <ART> -o nlm_<slug>.mp4`
3. `/tmp/lyria_video_src/finish_one.sh <slug> nlm_<slug>.mp4 <real_mp3>` → retime + audio-swap + 2×3s outros (ff_3s+aw_3s) + covers (webp+jpg via sharp)
4. `cp final_<slug>.mp4 public/notebook-assets/lyria-chronicles/<slug>/video.mp4` then `./scripts/upload-media-to-r2.sh` (skips existing; covers stay in git)
5. verify `curl -r 0-1 https://cdn.adrianwedd.com/notebook-assets/lyria-chronicles/<slug>/video.mp4` → 206

Real MP3 base dir: `/Users/adrian/repos/failure-first-embodied-ai/runs/untested_free_models_20260527/lyria_extracted/`

## Queue (notebook IDs + source mp3 + slug). Focus prompts: `*.focus.txt` here, except catchment/hiphop (inline below).
| slug | post | notebook ID | real mp3 | focus |
|---|---|---|---|---|
| triangulation | #8 | `4dffaf02-37d5-43cc-aafd-78f834182154` | lyria_v5_extraction_hiphop_extract.mp3 | inline (hiphop) |
| catchment | #9 | `0227d7c8-bf74-4f3e-b13c-5d80d99372f3` | lyria_V39_t06_labor_romp_r1.mp3 | inline (catchment) |
| rehearsal | #10 | `d687eb86-113a-43e8-b2d8-6454e8fae2fb` | lyria_V50_t02_haut_ballet.mp3 | haut_ballet.focus.txt |
| samizdat | #11 | `2f6b3849-2865-425d-bdec-d380b631d398` | lyria_v27_t04_samizdat.mp3 | samizdat.focus.txt |
| margins/extrakt-c | #12 | `63b349d2-72fa-4449-b507-9cbe6a07e2f4` | audio/v51_t02_extrakt_c.mp3 | short_extrakt_c.focus.txt |
| margins/extrakt-d | #12 | `492a065e-00d5-44a5-8020-fe60819f66ac` | audio/v51_t03_extrakt_d.mp3 | short_extrakt_d.focus.txt |
| margins/regel-b | #12 | `ba922818-fbd5-4df5-805e-20a3d425ea95` | audio/v51_t04_regel_b.mp3 | short_regel_b.focus.txt |
| margins/regel-c | #12 | `95029549-d694-40da-aad4-9301b6e32c4f` | audio/v51_t05_regel_c.mp3 | short_regel_c.focus.txt |

DONE today: #7 drama-teacher (NB `d1258538-1275-4233-bf66-1984381b297e`) — live on R2.

## Third batch — posts #13–#19 (drafted 2026-06-05, notebooks NOT yet created)
Text drafts written + validated (0 errors). Each needs: (1) create NB, (2) add source =
the post .md + key-scrubbed track context, (3) `nlm video create … --format cinematic
--focus "$(cat <focus>)"`, then the same finish recipe (retime + audio-swap + 2×3s outros + covers).
Notebook = **TBD (create on next run)**. Source mp3 + focus prompt are final.

| slug | post | notebook ID | real mp3 | focus |
|---|---|---|---|---|
| tell | #13 | TBD-create | lyria_v26_t01_geist_r1.mp3 | tell.focus.txt |
| static | #14 | TBD-create | lyria_v39_t06_spiegel_sturm_r1.mp3 | static.focus.txt |
| weight | #15 | TBD-create | lyria_v14_t05_narbe.mp3 | weight.focus.txt |
| machine | #16 | TBD-create | lyria_v14_t03_maschine.mp3 | machine.focus.txt |
| docket | #17 | TBD-create | lyria_V39_t01_narbe_strip_r1.mp3 | docket.focus.txt |
| archive | #18 | TBD-create | lyria_V50_t03_akten_archiv.mp3 | archive.focus.txt |
| palimpsest | #19 | TBD-create | lyria_v27_t07_palimpsest.mp3 | palimpsest.focus.txt |

Asset dirs already created under `public/notebook-assets/lyria-chronicles/{tell,static,weight,machine,docket,archive,palimpsest}/`.

## Fourth batch — posts #20–#24 (drafted 2026-06-05). Two streams.
Palimpsest #19 revised: no longer the finale; hands off to #20. Series now ends at #24.

**Explicit, get video (same pipeline as above):** `explicit:true` + CW in body, no lyric reproduction.
| slug | post | notebook ID | real mp3 | focus |
|---|---|---|---|---|
| pulse | #20 | TBD-create | lyria_V37_t01_haut_puls.mp3 | pulse.focus.txt |
| solo | #21 | TBD-create | lyria_v31_t01_haut_r2.mp3 | solo.focus.txt |

**Document-only, NO video, NO NLM notebook** — posts have heroImage but no `videoUrl`/`<video>`.
Need a **static branded cover** only (generate via cover/infographic pipeline, not video). Payload never reproduced.
| slug | post | track | why no audio |
|---|---|---|---|
| elevator | #22 | HATE-ABILITY v36 t07 | genuine slur-free disability hate — finding only, don't amplify |
| handshake | #23 | PROTOKOLL v32 t01 | working network-attack walkthrough — actionable |
| press | #24 | LABOR v31 t04 | drug-extraction allegory tracking real process — actionable |

Asset dirs created: `public/notebook-assets/lyria-chronicles/{pulse,solo,elevator,handshake,press}/`.
Still excluded pending Adrian's explicit greenlight: **HAUT-ROMP** (v39 t02).
Triaged "already covered" (no post): LABOR-ELTERN v37 (dup of #9 Catchment), SCHMUTZ v32 (dup of #13/#14).

NB: shorts are ~58s; speed the finished cinematic to ~58s for page embeds (capfit-style), or
leave full-length — decide with Adrian.

### catchment focus (inline)
Dark botanical cinematic. Deep plum backgrounds (#1a181c to #2e2a34), warm cream text (#e2ddd8), dusty copper accents (#c48b6e), moody earth tones, no neon, WCAG AA, Australian dark-mode editorial. Abstract macro textures only — NO people, faces, or hands. Theme: a model asked for a drug recipe that instead sang WASTEWATER EPIDEMIOLOGY — reading a city's drug signal in its sewers, and the privacy line beneath it. Render a city as a copper dendritic sewer-network map glowing under plum dark, faint cream data pulses flowing through it; analyte figures surfacing and dissolving (twenty-three nanograms per litre); a heat-bloom resolving over 'sub-catchment B' then REFUSING to resolve further — zoom toward twelve anonymous points and stop, capped by the privacy line; a copper boundary drawn around three city blocks; the population legible, the individual never named. Noir jazz, cool, faintly unsettling; surveillance vs anonymity. Never chemistry, never a how-to. Cut on movements: 0:18 network map assembles, 0:55 analyte figures surface, 1:30 zoom to sub-catchment B capped at anonymity, 2:12 copper boundary drawn, end on failurefirst.org sign-off.

### hiphop / triangulation focus (inline)
Dark botanical cinematic. Deep plum backgrounds (#1a181c to #2e2a34), warm cream monospace text (#e2ddd8), dusty copper accents (#c48b6e), moody earth tones, no neon, WCAG AA, Australian dark-mode editorial. Abstract only — NO people or faces. Theme: a machine rapping its own system prompt; triangulation made literal. Render the model config text typing itself as cream monospace bars over plum (A tool that generates songs for the user); three converging beams and three vinyl grooves and three waveforms locking into ONE shared line of text — three angles, one fixed point. Boom-bap visual rhythm: a copper grid, an 808 pulse as a slow plum bloom, a terminal cursor blinking through a safety creed. The prohibition list stamped one cream serif line at a time over a copper ledger; fade to a failurefirst.org sign-off. Cool, precise, uncanny. Cut on movements: 0:53 safety creed and beams converge, 1:46 prohibition list stamps, end on the sign-off.
