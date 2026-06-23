# Design: "An Agent in the Walls" — a 3-part network-rebuild series

**Date:** 2026-06-23
**Status:** Approved (structure + angle); drafting pending spec review
**Source material:** `~/unifi/STATE.md`, `~/unifi/docs/handoffs/*`, `~/unifi/docs/plans/*`
**Target:** `src/content/blog/` on adrianwedd.com (Astro content collection)

---

## Premise

Over ~6 sessions, an AI coding agent (Claude Code) reconfigured the author's **live** home
network — a Ubiquiti UDR7 — almost entirely through the controller's **private, undocumented
API** (the same endpoints the web UI calls). The work was done remotely, over a Starlink
CG-NAT link, with no physical console access, on a network that a single bad write could lock
both agent and author out of.

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
- **Cold open (2 paragraphs, not a section):** Starlink because no fibre; the UDR7. *Optional
  single-sentence aside* on Meraki licensing (see "Cuts" — all three reviewers wanted it gone;
  keep at most one sentence or drop).
- **Beats:** the blast-radius problem (remote, CG-NAT, no console); three independent backout
  paths engineered **first** (UniFi Teleport WireGuard / cloud Remote Access / a Tailscale
  subnet-router on a wired host); `DRY_RUN=1` as the seatbelt; reversible phase ordering; the
  never-tag-the-wired-management-host rule. **Then the payoff as the *result* of the discipline:**
  IoT VLAN isolation, a kids' network with content filtering + SafeSearch, zone-based firewall,
  IDS/IPS in block mode, a honeypot on the IoT subnet, encrypted DNS (DoH).
- **Audience:** ops / homelab / anyone who's been burned reconfiguring remote infra.

### Part 2 — *There Is No API* (`seriesOrder: 2`)
- **Spine:** The UDR7 has no public API, so you drive the same private endpoints the web UI
  uses — and the real work is mapping what's writable.
- **Beats:** auth (X-API-KEY → login fallback); the map — networks, SSIDs, and zone-based
  firewall **policies** are API-writable via "mirror an existing object, drop `_id`, swap the
  fields, POST"; `networkconf_id` is the real source of an SSID's VLAN (not the SSID's own
  `vlan` field); the silent failures (ad-block / IDS booleans return `rc=ok` then revert;
  content-filter rule CREATE → 405 but EDIT works); v10 enum surprises (`off|ids|ips`, not the
  old `detect|detect_and_block`).
- **PEAK — the human-in-the-loop boundary:** the moment the agent hit a wall it could not
  script around. The firewall-mode detector heuristic was *wrong* (an empty `/firewall-policies`
  array means "endpoint exists," not "ZBF active"); the box was never in ZBF; the agent had to
  ask the human to click **"Upgrade to Zone-Based Firewall"** in the UI. Same shape with
  IDS/IPS (`InvalidPayload` on the v10 schema → "toggle it in the UI"). This is the line
  between what an agent owns and what needs a human hand on the console.
- **Audience:** builders who hit undocumented APIs. The dev-detective story.

### Part 3 — *An Agent in the Walls* (`seriesOrder: 3`)
- **Spine:** What it means to hand a live network to an AI agent — the reflective close.
- **Beats:** `STATE.md` as durable shared memory across sessions; per-session handoff docs;
  the agentic-ops workflow pattern (read state → plan → dry-run → gate → write → verify →
  re-state); what an agent should and should not own; an explicit **ethics/limits note** (own
  network, with consent, secrets sanitized, no exploitation beyond observing the controller's
  own UI calls, no advice for attacking third-party UniFi controllers); a short "what I would
  *not* let the agent do" section.
- **Audience:** the AI/agents readership — the most on-brand piece.
- **Hedge:** if, after the cuts below, this drafts thin, collapse the series to 2 parts by
  folding this reflection into Part 1's tail. Decide at draft time, after Part 1 exists.

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
- The Cisco Meraki licensing gripe → **one sentence max, or drop.** (Author's genuine voice,
  but all three reviewers called it off-brand and narrative-breaking.)

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
| Zone/net/rule IDs (`6a38fcc6…`, etc.)    | `<net-id>` / omitted                        |
| MAC addresses                            | omitted / `xx:xx:…`                          |
| Real internal IPs in prose/diagrams      | RFC 5737 doc ranges (`192.0.2.0/24`, etc.) or `.x` |
| `homeassistant.adrianwedd.com`, hostnames| "my HA host" / generic                      |
| Cloudflare tunnel IDs / routes           | omitted                                      |
| "Obi, 7" (child's name + age)            | "the kids' network" / "my kid"              |
| Device specifics (Pi5+Hailo runs Frigate)| fuzz — generic "a Pi running my NVR"        |
| Honeypot exact IP (`.20.5`)              | "a decoy address low in the IoT subnet"     |
| Exact firewall policy *ordering*         | describe the principle, not the index map   |

RFC 1918 *concepts* (that there's a VLAN 20 for IoT, a /24, etc.) are fine to show — the
defensive configuration is worth sharing. The **identifiers that let someone target the
author's specific router** are not. Each draft carries this checklist at the top until clean.

---

## Shared conventions

- **Series name:** `An Agent in the Walls` (Part 3 is the "title track"). *Open item: confirm
  at review, or rename the series so it doesn't share a name with Part 3.*
- **Frontmatter:** `title`, `description` (≤160 chars — validated by `scripts/validate-content.js`
  and CI), `date`, `tags`, `series: 'An Agent in the Walls'`, `seriesOrder`, `draft: true` to
  start. Cross-link between parts (as the Lyria Chronicles posts do).
- **Tags:** `['engineering', 'networking', 'security', 'homelab', 'AI agents', 'Claude Code']`
- **Files:** `src/content/blog/dont-saw-off-the-branch-post.md`,
  `src/content/blog/there-is-no-api-post.md`,
  `src/content/blog/an-agent-in-the-walls-post.md` (follows the `-post.md` convention).
- **Dates:** author drips content; set per-post at publish time.

## Assets (out of scope for this spec)

Hero infographics + optional audio/video can be generated via the NotebookLM pipeline **after**
the text lands. Not part of this spec. (If added: branded dark-botanical `--focus` prompt per
CLAUDE.md; `.webp` heroImage needs a `.jpg` twin or the deploy gate fails.)

---

## Open items for the author at review

1. **2 vs 3 parts** — speccing 3 (reordered); the Part 3 hedge above is the escape valve.
2. **Series name vs Part 3 title** overlap — keep as title-track, or rename the series?
3. **Meraki aside** — one sentence, or cut entirely?
4. **Publish cadence** — all three at once, or drip (and in what order relative to other queued content)?
