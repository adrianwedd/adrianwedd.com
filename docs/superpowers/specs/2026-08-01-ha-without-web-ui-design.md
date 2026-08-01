# Design: "Home Assistant Without the Web UI"

**Date:** 2026-08-01
**Deliverable:** one blog post + NLM kit, on adrianwedd.com
**Source:** `~/unifi/docs/reference/claude-home-assistant-operations.md` @ `0ef8947`
(private repo — never linked or named in the published post)

## 1. Thesis

The Home Assistant login page at `:8123` has been unusable for stretches — the
Cloudflare Turnstile widget fails to render, so credentials cannot be submitted.
That outage did not create a problem; it exposed one. The web UI was never the
control plane. It is a view over a REST API, a websocket, and a Supervisor proxy,
all of which stay reachable when the browser path is dead.

The post is a field guide to operating the box from that layer, and every rule in
it carries the failure that produced it.

Secondary thesis, carried throughout rather than argued separately: **exit 0 is
not evidence.** The failures worth documenting here all reported success.

## 2. Scope

**In:** reaching the box, the auth channels, where you write and how each surface
reloads, driving config flows, add-on management, the short list of operations
that genuinely still need a browser, and how data gets in.

**Out**, deliberately:

- The subsystems built *on* the operating model — off-grid shutdown interlock,
  Nest/go2rtc camera pipeline, dashboard rationalisation. Those are separate
  documents and a much longer post.
- The QA methodology story (two reviewers, the rejected finding, the argv-size
  trap). Its own post, if ever. Decided 2026-08-01.
- The cloudflared tunnelling dead end. Off-topic — it concerns tunnelling the
  *router* UI, not operating HA — and only half-evidenced. Live read 2026-08-01:
  the add-on's options schema exposes no TLS-verify-off knob (true, as far as it
  goes), but `run_parameters` is a free-form string list with no enum, so the
  schema would accept the flag; any rejection happens inside the add-on's run
  script, which is not confirmable read-only. Cut. That verification is recorded
  here as the *reason for the cut* and does not appear in the post.

## 3. Placement

- **Path:** `src/content/blog/home-assistant-without-the-web-ui-post.md`
- **URL:** `/blog/home-assistant-without-the-web-ui/` (`slug()` strips `-post`,
  `src/lib/utils.ts:10`). Permanent once published.
- **Standalone, not a fourth part of "An Agent in the Walls."** That series
  closed deliberately — part 3 ends "This is the close of…", and its final
  paragraph turns on a cheerful `rc: ok`, which this post exists to distrust.
  Appending
  would undercut a finished ending. Cross-link instead, in both directions of
  reading: part 2 (`/blog/there-is-no-api/`) for the same house's router, part 3
  (`/blog/the-limits-of-the-walls/`) for the discipline, and
  `/blog/getting-google-nest-cameras-into-frigate-nvr/` for the same fleet.
- **Frontmatter:**
  ```
  title: 'Home Assistant Without the Web UI'
  description: 'The login page died, so I stopped using it. Operating Home Assistant over its APIs: three auth channels, where to write, and what silently eats your change.'
  date: 2026-08-01
  tags: ['engineering', 'homelab', 'home-assistant', 'raspberry-pi', 'ai-agents', 'claude-code']
  draft: false
  ```
  **`autopublish` is deliberately absent in phase 1.**
  `scripts/generate-social-queue.mjs` broadcasts at 09:00 Hobart on the post's
  `date`, and `date` is today — shipping `autopublish: true` before the assets
  exist would fire the social queue at a post with no hero, no audio and no
  video. It goes in at phase 7, once the kit is on the CDN.

  `heroImage`, `audioUrl`, `videoUrl` and `audioDuration` land at phase 3 with
  the R2 upload — `scripts/upload-videos-to-youtube.py` selects only non-draft
  posts that have a `videoUrl` and no `youtubeUrl` (lines 71–76), so `videoUrl`
  must precede phase 6. `youtubeUrl` is written by the uploader itself at
  phase 6; `videoUploadDate` it does not write (it writes only `youtubeUrl`,
  line 216) — set manually from the actual upload timestamp. `autopublish`
  alone lands at phase 7.
  Description is **156** chars — under the 160 gate in
  `scripts/validate-content.js`.

  `autopublish` is read by `generate-social-queue.mjs` via gray-matter (raw
  frontmatter), not the Zod schema — it is deliberately absent from
  `src/content.config.ts`, like the 20 published posts that already use it.
  **Do not add it to the schema.**

## 4. Sanitisation

Non-negotiable: the source repo is private and its journal contains a Wi-Fi
passphrase and infrastructure IDs.

| Source | Published as |
|---|---|
| `192.168.0.200`, `.116`, `.236` | `<HA_HOST>` etc. |
| `~/.ssh/claude_code_key` | `~/.ssh/<key>` |
| The five-row LLAT table (IDs, names, dates) | Cut. Lessons kept as prose. |
| `/home/pi/frigate-nvr/.ha_token` | "an admin token on another box" — path *and* hostname |
| `pi5-hailo` (and other fleet hostnames) | "another box on the fleet" |
| `UDR7` / the router model | "the router". The published parts 2 and 3 name it **zero** times — the blog has deliberately never identified the model, and §5.4's full-object-replace comparison is where it would leak. |
| `home.wedd.au` | `<external hostname>` |
| `172.30.32.0/23` | **Kept** — a fixed Supervisor docker range, identical on every install, and the value is the whole point of the fix. Has a home in §5.3. |
| `pi` (username) | **Kept.** A conventional add-on default, identical on every install, and §5.2 cannot describe the ephemeral-home-directory trap without it. Not a secret; not specific to this house. |
| `SPARK`, `px-mind`, `picar` | Kept only where already public; otherwise "a consumer". |

The unifi repo is never named or linked — and neither are its internal paths.
`docs/qa/…` and issue numbers from that repo are structure leaks, same as
hostnames.

**The sanitisation gate is an artifact, not just a table.** The NLM sources are
"the post plus the sanitised reference doc" (§7 phase 3) — that doc must be
*created*: copy the source reference doc to the session scratchpad, apply every
row of the table above, and run the pre-merge grep against it **before** it is
uploaded to NotebookLM. Generated assets get the same treatment on the way
back: read every word of text on the infographic (NLM infographics have
previously fabricated statistics and garbled titles), and spot-check the audio
and video for spoken identifiers, before anything goes to R2 or YouTube.

Pre-merge check — run against the finished post *and* the sanitised reference
doc:

```
grep -nE '192\.168\.|wedd\.au|UDR7|pi5-hailo|claude_code_key|unifi|docs/qa' <file>
grep -nE '\b[0-9a-f]{8}\b' <file>   # IDs from the journal; review hits manually —
                                    # 6-digit colour codes do not match this
```

## 5. Structure

Eleven sections plus a closing appendix, ~4,000 words. Each technique states the
failure that produced it.

1. **The forced move.** Turnstile dead; and separately, UI changes leave no diff,
   no backup, no reviewable artifact. Thesis stated.
2. **A shell first.** Port 22 is the Advanced SSH add-on, not HA OS's sshd. The
   pubkey belongs in the `ssh.authorized_keys` *option* — the real file is
   rendered from it on each start, so direct edits evaporate. One key per array
   element: two concatenated into one element made sshd parse the second as a
   *comment* on the first, and it read as "key auth just doesn't work."
   `/home/pi` is ephemeral (container overlay); outbound identity lives in
   `/data` + `init_commands`. `scp` fails — pipe through `cat >`.
3. **Three channels and a lever.** `SUPERVISOR_TOKEN` and `bash -lc` or 401 — the
   highest-frequency mistake, and it reads as a permissions problem. The
   important row: the Supervisor proxy serves the entire `:8123` REST API without
   ever authenticating to `:8123`. LLATs and their traps: the UI's "valid for 10
   years" is static boilerplate (the storage layer said 365 days); the Supervisor
   cannot mint them, so the old token bootstraps its replacement over the
   websocket; there is no revocation API; enumerate *deployments* not owners
   before revoking (one token was live in three places and revoking it broke a
   service nobody knew consumed it); a token in a file may be an identifier, not
   bearer material. The websocket for the five registry operations REST lacks.
   `sudo docker` as the diagnostic lever.
   **Aside, and the home for the one sanitisation exception:** if you reach the
   box through a tunnel or reverse proxy rather than on the LAN, Core needs an
   `http:` block with `use_x_forwarded_for: true` and
   `trusted_proxies: [172.30.32.0/23]` — the Supervisor add-on docker network,
   the same on every install — followed by a Core restart. Without it the
   requests fail at the proxy layer in a way that looks like a tunnel or DNS
   problem. Verified present on the box 2026-08-01.
4. **Where you write determines everything.** The reload-semantics table — plain
   YAML, `.storage`, websocket registry, add-on options, config entries — each
   with how to apply it and whether Core clobbers you. The centrepiece.
5. **The `.storage` rule.** Core holds the registry in memory and flushes it
   during its *own shutdown*, so edit-then-`/core/restart` writes your change and
   then overwrites it. `stop → edit → start`. Two refinements, both from QA:
   `POST /core/stop` **returns before the container is down**, so editing the
   instant it returns races the exact flush the stop exists to avoid — poll until
   gone; and once Core is stopped there is no container to `docker exec` into, so
   the edit must use the SSH add-on's own `sudo python3`. A first attempt that
   ignored this silently skipped every edit and restarted Core anyway.
6. **Config flows over REST.** Add an integration with no browser. `POST {}` to
   make the API report its own required keys — with its precondition: only safe
   when the step has a mandatory field with no default, or `{}` is a valid
   submission and you have just advanced the flow. Reading entries honestly:
   `source: ignore` and `disabled_by: user` are decisions, not breakage.
   **`DELETE /config_entries/entry/<id>` cascades** — it took all 12 of an
   entry's entities with it. Disable instead; the entry goes inert and its
   entities keep their history.
7. **Add-ons.** `ha apps`, and the subcommand that isn't: `ha apps list` prints
   the list, but so does `ha apps bogussubcommand` — the argument is *ignored*,
   not implemented. Use the API. `--location=.local` (the equals sign is
   required) because the default target is a down network mount. And the Google
   Drive Backup add-on prunes `/backup` per its own retention: a freshly created
   local backup vanished within minutes.
8. **The four things that still need a browser.** LLAT revocation (creation is
   API-only, revocation is not); companion-app sensor toggles, where the switch
   is on the *phone*, not the server; OAuth consent redirects; and the
   Tailscale admin console — `advertise_routes` is fully API-settable, and the
   route stays **dead until a human approves it in a browser on a different
   system entirely**. That last one is the most interesting of the four for this
   post's argument, and the reason the section says four: it is the failure mode
   the whole piece is about, wearing a different coat. Everything reads
   configured. Nothing is wrong. It does not work, and no call you can make from
   the box will tell you so.
9. **Exit 0 is not evidence.** The `.storage` flush; the silently skipped
   `python3` block; MQTT sensors not writing state on identical payloads, so
   `last_reported` froze at the last *value change* and a steady battery failed a
   120 s freshness check forever (`force_update: true`, load-bearing); a consumer
   with a dead token sitting `active (running)`, exit 0. Negative proof: an
   8-minute watcher saw the counter sawtooth and never reach its gate. Verify
   *settled* state, and know which resets are by design.
10. **Getting data in.** MQTT discovery, with the design decisions that are
    load-bearing: Python + paho, not `mosquitto_pub` (argv passwords are
    world-readable at `/proc/<pid>/cmdline`, once a minute, forever); **assert the
    CONNACK**, because `connect()` returns when TCP is up and a rejected password
    otherwise looks exactly like success; `expire_after`, not a last-will — this
    process connects, publishes and exits, so an LWT would fire on every
    *successful* run; retained *and* expiring, so a dead host goes unavailable
    rather than freezing at a stale-but-plausible value.
11. **Standing rules, and a note on staleness.** Nothing that merely looks dead
    gets switched off unasked. Prefer disable over delete. Back up before every
    write. Closing note, kept operational: the source notes for this post said
    Core 2026.6.4 / OS 18.0 / 58 entries / 22 add-ons; live reads on the day of
    writing returned 2026.7.4 / 18.1 / 57 / 15. A journal records what *was* true.

    *Provenance — spec-internal, never published:* the corrected header of the
    reference doc @ `0ef8947` carries only the version pair. The full quartet —
    including 58→57 entries and 22→15 add-ons — is recorded in the unifi repo's
    QA summary for issue 67 (2026-08-01), not in the reference doc itself. All
    four figures are real. The post states the numbers as "the source notes
    said / live reads returned" with **no citation of any file, path, repo or
    issue number** — a private-repo path in a published post is a structure
    leak, and `docs/qa` is now in the §4 grep for exactly this reason.

12. **Appendix: prompts to hand your agent.** The post's most reusable artifact,
    added 2026-08-01 at Adrian's direction: the audience most likely to need
    this material is a Claude (Code) user pointed at their own Home Assistant
    box, and the fastest way to transfer the lessons is as paste-able prompts,
    not prose. Two parts, both drafted with the §4 placeholders
    (`<HA_HOST>`, `~/.ssh/<key>`) so readers substitute their own values:

    a. **An operating-rules block** for the reader's `CLAUDE.md` / system
       prompt — the post's rules distilled into imperative agent instructions
       (~30 lines, one fenced markdown block, explicitly framed as
       "copy this into your agent's context"). Must encode at minimum:
       `SUPERVISOR_TOKEN` requires a login shell (`bash -lc`); prefer the
       Supervisor proxy (`/core/api/...`) over direct `:8123` auth; `.storage`
       edits are stop → poll-until-down → edit via the SSH add-on's own
       interpreter → start, never edit-then-restart; SSH keys go in the add-on's
       `ssh.authorized_keys` option, one key per array element, never the
       rendered file; prefer disable over delete — `DELETE
       /config_entries/entry/<id>` cascades to all entities; back up before
       every write, and the backup add-on may prune local backups; treat exit 0
       / `rc: ok` / `active (running)` as "the command ran", not "the change
       took" — verify settled state by reading it back after the relevant
       reload; `ha apps` ignores unknown subcommands, use the API;
       `--location=.local` on backup creation; MQTT publishing is Python +
       paho with the CONNACK asserted, never `mosquitto_pub` with an argv
       password; know the four browser-only operations and *say so* instead of
       retrying; nothing that merely looks dead gets switched off unasked.

    b. **Four task prompts**, each one paragraph, each mapping to a section of
       the post so the appendix doubles as an index: token audit (§3 —
       enumerate deployments before revoking anything); add an integration by
       config flow over REST (§6 — including the `POST {}` probe and its
       precondition); onboard an MQTT sensor end-to-end (§10 — discovery,
       expire_after, retained, CONNACK); and diagnose "configured but not
       working" (§9 — settled-state verification, `last_reported` vs
       `last_changed`, the freshness-check trap).

    The appendix contains **nothing not already in the body** — it is a
    distillation, so it adds no new sanitisation surface, but it still goes
    through the §4 greps with the rest of the post (prompts are the most
    copy-paste-prone text on the page; a leaked identifier here propagates
    into strangers' configs).

Every claim ships in one of three states. Nothing ships as an uncorroborated
assertion.

**Verified live, read-only, 2026-08-01** (HA OS 18.1, Core 2026.7.4):

- Non-login shell has no `SUPERVISOR_TOKEN` (`token_len=0`), Supervisor returns
  **401**, `ha` CLI reports "unauthorized".
- Supervisor proxy serves Core REST: `/core/api/states`, `/core/api/config`,
  `/core/api/config/config_entries/entry` all **200**; `POST /core/api/template`
  renders.
- Config-flow endpoint exists, POST-only (GET → **405**).
- `scp` fails ("subsystem request failed on channel 0"); `cat >` succeeds.
- 57 config entries — 50 loaded, 7 not; 6 `source: ignore`; 1 `disabled_by: user`.
- `ha apps list` and `ha apps bogussubcommand` produce identical output.
- The `http:` block is present with `use_x_forwarded_for` and the documented
  `trusted_proxies` range. → published as the §5.3 aside.
- Cloudflared add-on schema exposes no TLS-verify-off option; `run_parameters` is
  a free-form string list with no enum. → **not published**; this is the evidence
  behind the §2 cut, kept here so the decision is auditable.

**Corrected before publication.** The source doc said a conversation agent's
state is `"idle"`. It is not. Live, the four `conversation.*` entities read a
**last-used timestamp** (or `unknown`) — so `states('conversation.x')` returns a
date, silently, forever. Published as the corrected behaviour, which makes the
`response_variable` + `tts.speak` fix load-bearing rather than stylistic.

**Narrowed.** The `400: Bad Request` signature for a missing `http:` block is
uncorroborated in the source journal. The *remedy* is verified present on the
box, so the post states the requirement and omits the specific error string.

## 7. Sequencing

**Publication model: one feature branch, one merge.** Every phase below happens
on the branch; nothing merges to main until phase 7 is complete. The merge is
the publication event — the site deploy and the social-queue regeneration both
fire on that single push. This is what actually enforces the phase-2 QA gate:
`draft: false` from phase 1 is safe because an unmerged branch serves nothing.

1. Write the post, **without `autopublish`**. Create the sanitised reference
   doc (§4) and grep both. Validate: `node scripts/validate-content.js`,
   `npm run lint`, `npm run build`.
2. **QA on the unifi side** — technical accuracy against the box and the journal.
   **Gate: no NLM assets until this clears.**
3. NLM kit: audio overview, cinematic video (branded dark-botanical style prompt,
   no figures, no stock footage), **and the infographic hero — this step
   produces it; nothing earlier does.** Sources = the post plus the sanitised
   reference doc (§4 — grepped before upload). Review generated assets per §4.
   - **Audio/video: original quality, no re-encode — ever.** The "no re-encode"
     rule is about *audio and video streams*; it does not apply to images.
   - **Signoff sting:** no sting asset exists in this repo, on this machine, or
     at any guessable CDN key (verified 2026-08-01) — it has been produced ad
     hoc per video. Recover it once: the published videos carry it as their
     final ~3 s (e.g. `notebook-assets/the-index/video.mp4` on the CDN), so
     extract that tail with `-c copy`, verify it visually, and keep it as the
     canonical asset for this and future videos. Concat onto the new video with
     `-c copy` (stream copy both sides).
   - **Infographic: convert** the NLM PNG to
     `public/notebook-assets/<slug>/infographic.webp` (the established
     `cwebp`/sharp pattern, ~150 KB target) — this conversion is expected and
     is not a violation of the no-re-encode rule above.
   - Upload audio + sting'd video to R2 (`scripts/upload-media-to-r2.sh`);
     **write `videoUrl`, `audioUrl`, `heroImage`, `audioDuration` into
     frontmatter now** — phase 6's uploader refuses posts without `videoUrl`.
4. **Generate the `.jpg` twin** beside the `.webp` hero (from the original PNG,
   not the WebP). The deploy gate requires it and a local build does not catch
   its absence — this has broken main twice.
5. `src/content/audio/` entry cross-linking back to the post.
6. YouTube upload (public) via `scripts/upload-videos-to-youtube.py` — it
   selects non-draft posts with `videoUrl` and no `youtubeUrl`, and writes
   `youtubeUrl` back itself. **`videoUploadDate` it does not write:** set it
   manually from the actual upload timestamp.
7. **Last:** add `autopublish: true` (everything else is already in from
   phases 3–6). Re-run `node scripts/validate-content.js` after this edit —
   the phase-1 pass says nothing about frontmatter added later. **Check the
   date before merging:** `generate-social-queue.mjs` skips any post whose
   `date` is before today (Hobart) — "assumed already broadcast", silently. If
   the phases have spilled past midnight, bump `date` to the merge day first.
   Then merge.

Ordering rationale: the social queue fires on `date`, so `autopublish` is the
last thing to land and only once every asset it would advertise actually
exists — and `date` must still be "today" at the moment of merge, or the queue
drops the post without an error.

## 8. Risks

- **Sanitisation slip.** Mitigated by §4's table and the pre-merge grep defined
  at the end of §4 (single canonical list — do not duplicate it here).
- **Publishing a stale claim.** Mitigated by §6 — and by the fact that the
  staleness failure is itself in the post.
- **Length.** Eleven sections plus an appendix risks a reference dump. Every
  section must open with the failure, not the recipe; if a section cannot name
  what it cost, it gets cut. The appendix is exempt from the failure-first rule
  (it is deliberately a recipe) but not from the no-new-claims rule — anything
  in a prompt must be stated and evidenced in the body first.
