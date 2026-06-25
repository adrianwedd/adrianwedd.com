# Design: "An Agent in the Walls" — a 3-part network-rebuild series

**Date:** 2026-06-23
**Status:** Approved (structure + angle); 3-engine spec review folded in (2026-06-24); 2 author decisions resolved (2026-06-24); draft-ready
**Source material:** `~/unifi/STATE.md`, `~/unifi/docs/handoffs/*`, `~/unifi/docs/plans/*`
**Target:** `src/content/blog/` on adrianwedd.com (Astro content collection)

---

## Premise

Over ~6 sessions, an AI coding agent (Claude Code) reconfigured the author's **live** home
network — a Ubiquiti UDR7 — almost entirely through the controller's **private, undocumented
API** (the same endpoints the web UI calls). The work was done remotely, behind Starlink
CG-NAT — and double-NATed behind the Starlink router on top of that — with no physical console
access, on a network that a single bad write could lock both agent and author out of.

This is not a "how I set up VLANs" tutorial. It is an engineering-through-narrative series
about **giving an AI agent write-access to production infrastructure that has no safety net —
and building the safety net first.**

## The hook (carries the whole series)

> "I let an AI agent reconfigure the live router I was connected through — over Starlink, with
> no physical console, no documented API — and one bad write could have locked both of us out
> of the house."

Lead with the wager, then reveal the discipline that made it not-reckless. The interesting
thing is not bravado ("AI hacked my router") — it is **disciplined fear**. Treat the agent as
an eager but dangerous apprentice working in the dark, not a magic wand.

## Voice & register

- First-person, literary restraint, honest about tradeoffs — matches `zero-build-web-development`
  and the `120-models` methodology posts.
- **Parts 1 & 3:** past tense, narrative arc.
- **Part 2:** present tense for the API-discovery beats, forensic pace — e.g. *"I POST the
  mirror-copied network object. The response is `rc: ok`. I check the live config. The boolean
  has reverted to false."* (Matches the 120-models methodology sections.)
- ~1,800–2,500 words per part.

---

## Structure (3 parts, reordered to lead with stakes)

### Part 1 — *Don't Saw Off the Branch* (`seriesOrder: 1`)
- **Spine:** How do you let an agent rebuild a network you're remoted into, without locking
  yourself out — and what did the rebuild produce?
- **Cold open (2 paragraphs, not a section):** Starlink because no fibre; the UDR7. No vendor
  aside — the Meraki licensing gripe is cut (see "Cuts"); keep the open tight on the stakes.
- **Beats:** the blast-radius problem (remote, CG-NAT, no console); three independent backout
  paths engineered **first** (UniFi Teleport WireGuard / cloud Remote Access / a Tailscale
  subnet-router on a wired host); **the backout that had to be rebuilt mid-session** — the
  original plan assumed an *onsite* Pi subnet-router; it turned out to be offsite, so the whole
  backout had to be redesigned before any write could proceed. *This is the truer discipline
  beat than "build backouts first": the rule is "when your backout fails its own assumptions,
  stop and rebuild it before you touch anything."* `DRY_RUN=1` as the seatbelt — and the
  concrete reason it earns its keep: a bash parsing bug in `setup-iot-vlan.sh` (an empty
  Wi-Fi-band field shifted the `ap_group_id` into the wrong `read` variable → a *false "no
  ap_group_ids found" abort*; per `STATE.md`, caught in dry-run QA, "would have failed a live
  run too"). The lesson is brittle shell logic, not only hallucinated APIs — and dry-run doubling
  as a test harness is how it surfaced before a live run could die halfway. *(NB: not a silent
  payload mutation — the earlier "mutated a live payload" framing was corrected against the source
  2026-06-24.)* Reversible phase ordering;
  the rule that the **sole wired management station must never be VLAN-tagged** (lose its path
  and you lose the console). **The Starlink SSID drain** — rename the old router's SSID to match
  the new one's so IoT devices silently roam onto the new network with zero per-device
  reconfig (the literal "don't saw off the branch" move). **Then the payoff as the *result* of
  the discipline:** IoT VLAN isolation, a kids' network with content filtering + SafeSearch,
  zone-based firewall, encrypted DNS (DoH). *IDS/IPS **and the IoT-subnet honeypot** are
  deliberately **not** listed here — IPS enable-via-UI is Part 2's climax, and the honeypot
  rides on it (same `ips` settings object, needs Threat Management live), so both pay off there.
  Naming them as settled Part 1 wins deflates that peak.*
- **Audience:** ops / homelab / anyone who's been burned reconfiguring remote infra.

### Part 2 — *There Is No API* (`seriesOrder: 2`)
- **Spine:** The UDR7 has no public API, so you drive the same private endpoints the web UI
  uses — and the real work is mapping what's writable.
- **Beats:** auth (X-API-KEY → login fallback); the map — networks, SSIDs, and zone-based
  firewall **policies** are API-writable via "mirror an existing object, drop `_id`, swap the
  fields, POST"; `networkconf_id` is the real source of an SSID's VLAN (not the SSID's own
  `vlan` field); the silent failures (ad-block / IDS booleans return `rc=ok` then revert;
  a DHCP reservation POSTed with `network_id: null` returns `rc=ok` and never takes effect;
  content-filter rule CREATE → 405 but EDIT works) — a recurring "the API said yes and meant no"
  pattern that makes *verify-after-write* non-negotiable; v10 enum surprises (`off|ids|ips`, not
  the old `detect|detect_and_block`).
- **PEAK — the human-in-the-loop boundary:** the moment the agent hit a wall it could not
  script around. The firewall-mode detector heuristic was *wrong* (an empty `/firewall-policies`
  array means "endpoint exists," not "ZBF active"); the box was never in ZBF; the agent had to
  ask the human to click **"Upgrade to Zone-Based Firewall"** in the UI. Same shape with
  IDS/IPS (`InvalidPayload` on the v10 schema → "toggle it in the UI"). This is the line
  between what an agent owns and what needs a human hand on the console.
- **Resolution (the reward for crossing the wall):** once the human clicked the toggle, IPS came
  up in full prevention mode (`ips_mode: ips`, not just detection) — and *now* the agent, finally
  unblocked, could do what it couldn't before: it dropped a **honeypot** on the IoT subnet
  (a decoy address low in the subnet, below the DHCP pool) by GET-modify-POSTing the now-valid
  `ips` object. The boundary isn't a dead end — past it, agent and human each did the half only
  they could. *(Live as of 2026-06-24: IPS active, honeypot in place, ZBF enforcing.)*
- **Audience:** builders who hit undocumented APIs. The dev-detective story.

### Part 3 — *The Limits of the Walls* (`seriesOrder: 3`)
*Working title (author's lean); alternative on the table: "What I Won't Let It Touch". Confirm
at draft time. The series umbrella stays "An Agent in the Walls" — and that phrase is **spent as
a line inside Part 3's prose**, where it hits harder as a moment than it would as a redundant
header.*
- **Spine:** What it means to hand a live network to an AI agent — the reflective close.
- **Beats:** `STATE.md` as durable shared memory across sessions; per-session handoff docs;
  the agentic-ops workflow pattern (read state → plan → dry-run → gate → write → verify →
  re-state); what an agent should and should not own; an explicit **ethics/limits note** (own
  network, with consent, secrets sanitized, no exploitation beyond observing the controller's
  own UI calls, no advice for attacking third-party UniFi controllers); a short "what I would
  *not* let the agent do" section.
- **Audience:** the AI/agents readership — the most on-brand piece.
- **Hedge:** if, after the cuts below, this drafts thin, collapse the series to 2 parts by
  folding this reflection into **Part 2's** tail — *not* Part 1's. The reflection only lands
  after the reader has seen the struggle (the API detective work and the human-in-the-loop
  wall); folding it into Part 1 would have you reflecting on a boundary before you've shown it.
  Decide at draft time, after Parts 1 and 2 exist.

---

## Cuts (reviewer consensus — these are journal entries, not narrative)

- The Home Assistant Pi4 Core-update subplot — the 2026.6.4 update that kept failing (root-caused in a
  later session to a **corrupt image / 0-byte `const.py`**, NOT the OOM it was first mistaken for — the
  source notes' original "memory-blocked" framing has since been corrected). Belongs in a separate HA
  forensic-debugging
  post if anything — "the 0-byte file that masqueraded as an out-of-memory crash" — not this series.
- The InfluxDB recovery arc.
- The Frigate camera-debugging thread.
- The Dyson DHCP tangent.
- The U7 Mesh / outdoor-WAP shopping.
- The full domestic device inventory.
- The Cisco Meraki licensing gripe → **cut from the series** (author's call, 2026-06-24;
  unanimous reviewer recommendation — off-brand and narrative-breaking in a discipline-and-restraint
  story). *Not binned, parked:* the motivation behind it ("done renting features from a licensing
  portal" → went Ubiquiti with a self-hosted controller) is the clean seed for a **separate future
  post** on leaving subscription networking, not a clause in this cold open.

Keep an operational detail **only** if it proves the agent's method or one of the three
arguments (discipline / API reality / agentic reflection).

---

## Sanitization policy (applied to ALL parts, before drafting)

The source notes are full of live secrets and an exact internal map. Reviewers' strongest
shared warning: publishing this verbatim hands an attacker who breaches the perimeter a head
start, and one passphrase is for a **child's** network.

| Real (in source)                         | Published                                  |
|------------------------------------------|--------------------------------------------|
| `Cactus-Maple-Pixel-37` (kids SSID PSK)  | **dropped entirely** ("a generated passphrase") |
| `HORRIBLY1premiere*cabbage` (trusted PSK)| **dropped entirely**                       |
| **SSID names** (`Cygnet`, `Cygnet-Trusted`, `Cygnet-Kids`, `Shack`, `UniFi`) | **generic** ("the main SSID", "the kids' SSID") — these are locally scannable; anyone in Wi-Fi range can correlate the post to the physical house |
| Zone/net/rule IDs (`6a38fcc6…`, etc.)    | `<net-id>` / omitted                        |
| MAC addresses                            | omitted / `xx:xx:…`                          |
| Real internal IPs in prose/diagrams      | RFC 5737 doc ranges (`192.0.2.0/24`, etc.) or `.x` |
| `homeassistant.adrianwedd.com`, hostnames| "my HA host" / generic                      |
| **Secondary domains** (`spark-api.wedd.au`, other `*.adrianwedd.com`) | omitted / generic |
| Cloudflare tunnel IDs / routes / **account IDs** | omitted                              |
| **Hardware serial / model IDs** (e.g. the Dyson hostname `YN9-AU-KHA0093A` — a unique serial) | omitted / "an IoT device" |
| **Exact firmware / app versions** (controller + add-ons) | round or omit ("a recent v10 build") |
| **SSH usernames / key paths**            | omitted / generic                           |
| **Backup slugs** (e.g. `89c842af`)       | omitted                                      |
| **Tailscale route names / node names**   | omitted / generic                           |
| "Obi, 7" (child's name + age)            | "the kids' network" / "my kid"              |
| Device specifics (Pi5+Hailo runs Frigate)| fuzz — generic "a Pi running my NVR"        |
| Honeypot exact IP (`.20.5`)              | "a decoy address low in the IoT subnet"     |
| Exact firewall policy *ordering*         | describe the principle, not the index map   |

> **Cross-beat note:** the "Starlink SSID drain" beat in Part 1 depends on the real
> `Cygnet`→`Shack` rename. Because SSID names are now sanitized, write that beat with generic
> names — *"I renamed the old router's SSID to match the new one's"* — never the literal strings.

RFC 1918 *concepts* (that there's a VLAN 20 for IoT, a /24, etc.) are fine to show — the
defensive configuration is worth sharing. The **identifiers that let someone target the
author's specific router** are not. Each draft carries this checklist at the top until clean.

---

## Shared conventions

- **Series name:** `An Agent in the Walls` — the umbrella over all three parts. *Resolved
  2026-06-24:* Part 3 gets its own title (working: "The Limits of the Walls") so the series
  index doesn't stutter ("An Agent in the Walls › Part 3: An Agent in the Walls"). The umbrella
  phrase is spent as a line inside Part 3's prose instead.
- **Frontmatter:** `title`, `description` (≤160 chars — validated by `scripts/validate-content.js`
  and CI), `date`, `tags`, `series: 'An Agent in the Walls'`, `seriesOrder`, `draft: true` to
  start. Cross-link between parts (as the Lyria Chronicles posts do).
- **Tags:** `['engineering', 'networking', 'security', 'homelab', 'AI agents', 'Claude Code']`
- **Files:** `src/content/blog/dont-saw-off-the-branch-post.md`,
  `src/content/blog/there-is-no-api-post.md`,
  `src/content/blog/the-limits-of-the-walls-post.md` (Part 3 filename follows its *own* title,
  not the series umbrella; lock the slug to the final Part 3 title before publishing — URLs are
  permanent). Follows the `-post.md` convention.
- **Dates:** author drips content; set per-post at publish time.

## Assets (out of scope for this spec)

Hero infographics + optional audio/video can be generated via the NotebookLM pipeline **after**
the text lands. Not part of this spec. (If added: branded dark-botanical `--focus` prompt per
CLAUDE.md; `.webp` heroImage needs a `.jpg` twin or the deploy gate fails.)

---

## Open items for the author at review

*Resolved by the 3-engine review (2026-06-24):*
- **2 vs 3 parts** — keep **3** (unanimous); the Part 2-tail hedge above is the escape valve.
- **Publish cadence** — **drip weekly, Part 1 first** (unanimous).

*Resolved by the author (2026-06-24):*
1. **Series name vs Part 3 title** — keep the umbrella **"An Agent in the Walls"**; give Part 3
   its **own** title (working: *"The Limits of the Walls"*; alt: *"What I Won't Let It Touch"*).
   Neither reviewer pole won: the umbrella phrase is too good to lose (Hermes/Codex were right to
   keep it) but the collision stutters (Agy was right) — and Agy's specific fix, *"The Human in
   the Loop"*, collides with **Part 2's** climax. The umbrella phrase is spent in-prose in Part 3.
2. **Meraki aside** — **cut from the series**; parked as a future-post seed (see "Cuts").

*Confirm at draft time:*
- Final Part 3 title (locks the file slug — URLs are permanent).
