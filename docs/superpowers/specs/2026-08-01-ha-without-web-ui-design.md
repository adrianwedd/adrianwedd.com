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
- The cloudflared/UDR7 tunnelling dead end. Weakly evidenced and off-topic — it
  concerns tunnelling the *router* UI, not operating HA. Cut.

## 3. Placement

- **Path:** `src/content/blog/home-assistant-without-the-web-ui-post.md`
- **URL:** `/blog/home-assistant-without-the-web-ui/` (`slug()` strips `-post`,
  `src/lib/utils.ts:10`). Permanent once published.
- **Standalone, not a fourth part of "An Agent in the Walls."** That series
  closed deliberately — part 3 ends "This is the close of…", and its final
  paragraph turns on a cheerful `rc: ok`, which is this post's thesis. Appending
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
  autopublish: true
  ```
  `heroImage`, `audioUrl`, `videoUrl`, `audioDuration`, `youtubeUrl` added in
  phase 3. Description is 154 chars — under the 160 gate in
  `scripts/validate-content.js`.

## 4. Sanitisation

Non-negotiable: the source repo is private and its journal contains a Wi-Fi
passphrase and infrastructure IDs.

| Source | Published as |
|---|---|
| `192.168.0.200`, `.116`, `.236` | `<HA_HOST>` etc. |
| `~/.ssh/claude_code_key` | `~/.ssh/<key>` |
| The five-row LLAT table (IDs, names, dates) | Cut. Lessons kept as prose. |
| `/home/pi/frigate-nvr/.ha_token` | "an admin token on another box" |
| `home.wedd.au` | `<external hostname>` |
| `172.30.32.0/23` | **Kept** — a fixed Supervisor docker range, identical on every install, and the value is the whole point of the fix. |
| `SPARK`, `px-mind`, `picar` | Kept only where already public; otherwise "a consumer". |

The unifi repo is never named or linked.

## 5. Structure

Eleven sections, ~3,500 words. Each technique states the failure that produced it.

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
8. **The three things that still need a browser.** LLAT revocation, companion-app
   sensor toggles, OAuth consent. Stated precisely because the list is so short.
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

## 6. Evidence standard

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
  `trusted_proxies` range.
- Cloudflared add-on schema exposes no TLS-verify-off option; `run_parameters` is
  a free-form string list with no enum.

**Corrected before publication.** The source doc said a conversation agent's
state is `"idle"`. It is not. Live, the four `conversation.*` entities read a
**last-used timestamp** (or `unknown`) — so `states('conversation.x')` returns a
date, silently, forever. Published as the corrected behaviour, which makes the
`response_variable` + `tts.speak` fix load-bearing rather than stylistic.

**Narrowed.** The `400: Bad Request` signature for a missing `http:` block is
uncorroborated in the source journal. The *remedy* is verified present on the
box, so the post states the requirement and omits the specific error string.

## 7. Sequencing

1. Write the post. Validate: `node scripts/validate-content.js`,
   `npm run lint`, `npm run build`.
2. **QA on the unifi side** (operator is arranging) — technical accuracy against
   the box and the journal. **Gate: no NLM assets until this clears.**
3. NLM kit: audio overview, cinematic video (branded dark-botanical style prompt,
   no figures, no stock footage), infographic hero. Sources = the published page
   plus the sanitised reference doc. Upload audio/video to R2, infographic to
   `public/notebook-assets/`; original quality, no re-encode. Signoff sting on
   the video before upload.
4. `src/content/audio/` entry cross-linking back to the post.
5. YouTube upload (public), `youtubeUrl` + `videoUploadDate` into frontmatter.
6. `.webp` heroImage needs its `.jpg` twin or the deploy gate fails.

## 8. Risks

- **Sanitisation slip.** Mitigated by §4's table and a pre-merge grep for
  `192.168.`, `wedd.au`, key filenames and token fragments across the post.
- **Publishing a stale claim.** Mitigated by §6 — and by the fact that the
  staleness failure is itself in the post.
- **Length.** Eleven sections risks a reference dump. Every section must open
  with the failure, not the recipe; if a section cannot name what it cost, it
  gets cut.
